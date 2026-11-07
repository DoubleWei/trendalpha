"""TrendMatrixEngine：並行收集所有外掛訊號 → 加權聚合 → 產出總分與維度明細。"""
import asyncio
import logging
import time
from collections import defaultdict, deque
from dataclasses import dataclass
from datetime import datetime, timezone

from app.core.scoring import clamp
from app.engine.summarizer import RuleBasedSummarizer, Summarizer
from app.fetchers.base import BaseEventFetcher
from app.schemas.extras import HistoryPoint
from app.schemas.market import FactorItem, FactorsResponse, GlobalScoreResponse, Regime
from app.schemas.signal import EventSignal, FactorCategory

logger = logging.getLogger(__name__)

CATEGORY_LABELS: dict[FactorCategory, str] = {
    FactorCategory.MACRO: "全球總經",
    FactorCategory.US_TECH: "美國科技股",
    FactorCategory.COMMODITY: "原物料市場",
    FactorCategory.TW_FLOW: "台灣內部籌碼",
    FactorCategory.NEWS: "產業新聞",
}

# (下限分數, 狀態, 中文標籤) —— 由高到低比對
REGIME_TABLE: list[tuple[float, Regime, str]] = [
    (60, Regime.EXTREME_BULL, "強勢多頭"),
    (25, Regime.STRONG_BULL, "穩健多頭"),
    (8, Regime.MILD_BULL, "偏多震盪"),
    (-8, Regime.NEUTRAL, "中性盤整"),
    (-25, Regime.MILD_BEAR, "偏空震盪"),
    (-60, Regime.STRONG_BEAR, "弱勢空頭"),
    (-101, Regime.EXTREME_BEAR, "極度空頭"),
]


@dataclass(frozen=True)
class MarketSnapshot:
    global_score: GlobalScoreResponse
    factors: FactorsResponse
    extras: dict  # 各外掛的附帶資料，例如 {"news": NewsDigest}


class TrendMatrixEngine:
    def __init__(
        self,
        fetchers: list[BaseEventFetcher],
        *,
        timeout_sec: float = 8.0,
        cache_ttl_sec: int = 60,
        extreme_threshold: float = 0.8,
        category_multipliers: dict[str, float] | None = None,
        summarizer: Summarizer | None = None,
        data_mode: str = "live",
        history_max_points: int = 672,
    ) -> None:
        self.data_mode = data_mode
        self.history: deque[HistoryPoint] = deque(maxlen=history_max_points)
        self.fetchers = fetchers
        self.timeout_sec = timeout_sec
        self.cache_ttl_sec = cache_ttl_sec
        self.extreme_threshold = extreme_threshold
        self.category_multipliers = category_multipliers or {}
        self.summarizer = summarizer or RuleBasedSummarizer()
        self._cache: tuple[float, MarketSnapshot] | None = None
        self._lock = asyncio.Lock()

    # ------------------------------------------------------------------ 收集
    async def _run_one(self, fetcher: BaseEventFetcher) -> list[EventSignal]:
        return await asyncio.wait_for(fetcher.fetch_signals(), timeout=self.timeout_sec)

    async def collect(self) -> tuple[list[EventSignal], list[str], dict]:
        """並行執行所有外掛；單一外掛失敗或逾時只會被記錄，不影響其他外掛。"""
        results = await asyncio.gather(*(self._run_one(f) for f in self.fetchers), return_exceptions=True)
        signals: list[EventSignal] = []
        failed: list[str] = []
        extras: dict = {}
        for fetcher, result in zip(self.fetchers, results):
            if isinstance(result, BaseException):
                logger.error("fetcher '%s' failed: %r", fetcher.name, result)
                failed.append(fetcher.name)
                continue
            signals.extend(s if s.category else s.model_copy(update={"category": fetcher.category}) for s in result)
            extras.update(fetcher.artifacts())
        return signals, failed, extras

    # ------------------------------------------------------------------ 聚合
    def effective_weight(self, s: EventSignal) -> float:
        mult = self.category_multipliers.get(s.category.value, 1.0) if s.category else 1.0
        return s.weight * mult

    def aggregate(self, signals: list[EventSignal]) -> tuple[float, float]:
        """回傳 (總分 -100~100, 一致度 0~1)。"""
        total_w = sum(self.effective_weight(s) for s in signals)
        if total_w == 0:
            return 0.0, 0.0
        net = sum(s.trend_score * self.effective_weight(s) for s in signals)
        gross = sum(abs(s.trend_score) * self.effective_weight(s) for s in signals)
        score = clamp(net / total_w) * 100
        confidence = abs(net) / gross if gross else 0.0
        return round(score, 1), round(confidence, 3)

    @staticmethod
    def classify(score: float) -> tuple[Regime, str]:
        for floor, regime, label in REGIME_TABLE:
            if score >= floor:
                return regime, label
        return REGIME_TABLE[-1][1], REGIME_TABLE[-1][2]

    def build_factors(self, signals: list[EventSignal], now: datetime) -> FactorsResponse:
        grouped: dict[FactorCategory, list[EventSignal]] = defaultdict(list)
        for s in signals:
            if s.category:
                grouped[s.category].append(s)
        total_w = sum(self.effective_weight(s) for s in signals) or 1.0

        items: list[FactorItem] = []
        for cat in FactorCategory:  # 固定順序，前端排版穩定
            group = grouped.get(cat)
            if not group:
                continue
            w = sum(self.effective_weight(s) for s in group)
            weighted = sum(s.trend_score * self.effective_weight(s) for s in group)
            cat_score = clamp(weighted / w) if w else 0.0
            items.append(
                FactorItem(
                    category=cat,
                    label=CATEGORY_LABELS[cat],
                    score=round(cat_score, 4),
                    weight_share=round(w / total_w, 4),
                    contribution=round(weighted / total_w * 100, 2),
                    is_extreme=abs(cat_score) > self.extreme_threshold,
                    signals=group,
                )
            )
        return FactorsResponse(factors=items, extreme_threshold=self.extreme_threshold, generated_at=now)

    # ------------------------------------------------------------------ 對外
    async def compute(self) -> MarketSnapshot:
        signals, failed, extras = await self.collect()
        now = datetime.now(timezone.utc)
        score, confidence = self.aggregate(signals)
        regime, label = self.classify(score)
        if signals:
            self.history.append(HistoryPoint(t=now, score=score, regime_label=label))
        summary = await self.summarizer.summarize(score, label, confidence, signals)
        return MarketSnapshot(
            global_score=GlobalScoreResponse(
                score=score,
                regime=regime,
                regime_label=label,
                confidence=confidence,
                summary=summary,
                signal_count=len(signals),
                failed_sources=failed,
                data_mode=self.data_mode,
                generated_at=now,
            ),
            factors=self.build_factors(signals, now),
            extras=extras,
        )

    async def snapshot(self, *, force: bool = False) -> MarketSnapshot:
        """TTL 快取 + 鎖：多個請求同時湧入時只會觸發一次外部抓取。"""
        if not force and self._cache and time.monotonic() - self._cache[0] < self.cache_ttl_sec:
            return self._cache[1]
        async with self._lock:
            if not force and self._cache and time.monotonic() - self._cache[0] < self.cache_ttl_sec:
                return self._cache[1]
            snap = await self.compute()
            self._cache = (time.monotonic(), snap)
            return snap
