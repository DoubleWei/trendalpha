"""產業新聞外掛：吸收 FinMind（台股）與 yfinance（美股）的個股新聞，依產業聚合情緒。

輸出兩種東西：
1. EventSignal：每個產業一個訊號，進入總分（維度 = 產業新聞）
2. NewsDigest artifact：完整新聞清單 + 產業熱度，供前端新聞牆 / 熱力圖使用
"""
import asyncio
import logging
import random
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

from app.core.scoring import clamp
from app.fetchers.base import BaseEventFetcher, FetcherContext
from app.fetchers.registry import register_fetcher
from app.news import sentiment
from app.news.sources import RawArticle, finmind_news, yfinance_news
from app.news.taxonomy import INDUSTRIES, INDUSTRY_BY_KEY
from app.schemas.news import IndustryPulse, NewsArticle, NewsDigest
from app.schemas.signal import EventSignal, FactorCategory

logger = logging.getLogger(__name__)

LOOKBACK_DAYS = 4
HALF_LIFE_HOURS = 24.0
MAX_ARTICLES = 80
CONCURRENCY = 4


@register_fetcher
class IndustryNewsFetcher(BaseEventFetcher):
    name = "industry_news"
    category = FactorCategory.NEWS

    def __init__(self, ctx: FetcherContext) -> None:
        super().__init__(ctx)
        self._digest: NewsDigest | None = None

    def artifacts(self) -> dict:
        return {"news": self._digest} if self._digest else {}

    # ------------------------------------------------------------ 收集
    async def _collect_live(self) -> list[RawArticle]:
        sem = asyncio.Semaphore(CONCURRENCY)
        fm = self.ctx.finmind
        assert fm is not None

        async def guarded(coro, label: str):
            async with sem:
                try:
                    return await coro
                except Exception as exc:  # noqa: BLE001 - 單一標的失敗不影響其他
                    logger.warning("[industry_news] %s failed: %r", label, exc)
                    return []

        tasks = []
        for ind in INDUSTRIES:
            tasks += [guarded(finmind_news(fm, s, LOOKBACK_DAYS), f"finmind:{s}") for s in ind.tw_symbols]
            tasks += [guarded(yfinance_news(s), f"yfinance:{s}") for s in ind.us_symbols]
        results = await asyncio.gather(*tasks)
        return [a for batch in results for a in batch]

    def _collect_mock(self) -> list[RawArticle]:
        rng = random.Random(int(datetime.now().timestamp() // 600))
        samples = [
            ("2330", "台積電先進製程訂單滿載，CoWoS 擴產進度優於預期"),
            ("2454", "聯發科旗艦晶片出貨強勁，第四季營收年增雙位數成長"),
            ("NVDA", "Nvidia shares jump as data center demand beats estimates"),
            ("2382", "廣達 AI 伺服器出貨攀升，法人看好明年營運"),
            ("3231", "緯創 GB 系列急單湧入，產能滿載"),
            ("SMCI", "Super Micro falls after auditor concerns resurface"),
            ("2317", "鴻海 10 月營收月減，消費電子進入淡季"),
            ("AAPL", "Apple iPhone demand in China slumps, analysts cut forecasts"),
            ("2345", "智邦 800G 交換器需求旺，毛利率上修"),
            ("2881", "富邦金前三季獲利創新高，壽險投資收益回溫"),
            ("2603", "長榮運價走弱，紅海航線恢復帶來供給壓力"),
            ("1301", "台塑石化報價疲軟，下游需求不如預期"),
            ("2303", "聯電成熟製程價格承壓，庫存調整延續"),
            ("ANET", "Arista raises outlook on strong AI networking growth"),
        ]
        now = datetime.now(timezone.utc)
        return [
            RawArticle(t, None, "Mock News", now - timedelta(hours=rng.uniform(0.5, 60)), s, "mock")
            for s, t in samples
        ]

    # ------------------------------------------------------------ 分類 / 聚合
    @staticmethod
    def _symbol_industry() -> dict[str, str]:
        mapping: dict[str, str] = {}
        for ind in INDUSTRIES:
            for s in (*ind.tw_symbols, *ind.us_symbols):
                mapping.setdefault(s, ind.key)
        return mapping

    def _classify(self, raws: list[RawArticle]) -> list[NewsArticle]:
        sym2ind = self._symbol_industry()
        cutoff = datetime.now(timezone.utc) - timedelta(days=LOOKBACK_DAYS)
        merged: dict[str, NewsArticle] = {}
        for r in raws:
            if r.published_at < cutoff:
                continue
            key = "".join(r.title.lower().split())[:60]
            if key in merged:  # 同一則新聞出現在多檔個股：合併代碼
                if r.symbol not in merged[key].symbols:
                    merged[key].symbols.append(r.symbol)
                continue
            ind = INDUSTRY_BY_KEY[sym2ind[r.symbol]]
            s, matched = sentiment.score(r.title)
            merged[key] = NewsArticle(
                title=r.title,
                url=r.url,
                source=r.source,
                published_at=r.published_at,
                industry=ind.key,
                industry_label=ind.label,
                symbols=[r.symbol],
                sentiment=round(s, 3),
                matched=matched,
                provider=r.provider,
            )
        return sorted(merged.values(), key=lambda a: a.published_at, reverse=True)

    @staticmethod
    def _decay(a: NewsArticle, now: datetime) -> float:
        age_h = max(0.0, (now - a.published_at).total_seconds() / 3600)
        return 0.5 ** (age_h / HALF_LIFE_HOURS)

    def _aggregate(self, articles: list[NewsArticle]) -> list[IndustryPulse]:
        now = datetime.now(timezone.utc)
        grouped: dict[str, list[NewsArticle]] = defaultdict(list)
        for a in articles:
            grouped[a.industry].append(a)

        pulses: list[IndustryPulse] = []
        for ind in INDUSTRIES:
            group = grouped.get(ind.key, [])
            weights = [self._decay(a, now) for a in group]
            total_w = sum(weights)
            raw = sum(a.sentiment * w for a, w in zip(group, weights)) / total_w if total_w else 0.0
            # 新聞量少時往 0 收縮，避免一則標題就把產業推到極端
            shrunk = clamp(raw * total_w / (total_w + 1.5) * 2.2)
            top = max(group, key=lambda a: abs(a.sentiment) * self._decay(a, now), default=None)
            pulses.append(
                IndustryPulse(
                    key=ind.key,
                    label=ind.label,
                    score=round(shrunk, 4),
                    article_count=len(group),
                    bullish=sum(a.sentiment > 0.05 for a in group),
                    bearish=sum(a.sentiment < -0.05 for a in group),
                    top_headline=top.title if top else None,
                )
            )
        return pulses

    # ------------------------------------------------------------ 對外
    async def fetch_signals(self) -> list[EventSignal]:
        raws = await self._collect_live() if self.ctx.settings.use_live_data else self._collect_mock()
        if not raws:
            raise ValueError("no news returned by FinMind or yfinance")

        articles = self._classify(raws)
        pulses = self._aggregate(articles)
        self._digest = NewsDigest(
            industries=pulses,
            articles=articles[:MAX_ARTICLES],
            providers=dict(Counter(a.provider for a in articles)),
            generated_at=datetime.now(timezone.utc),
        )
        logger.info("[industry_news] %d raw → %d articles %s", len(raws), len(articles), self._digest.providers)

        signals: list[EventSignal] = []
        for p in pulses:
            if p.article_count == 0:
                continue
            ind = INDUSTRY_BY_KEY[p.key]
            headline = (p.top_headline or "")[:26]
            signals.append(
                self.signal(
                    f"{p.label}新聞",
                    p.score,
                    ind.importance * min(1.0, 0.3 + 0.07 * p.article_count) * 0.6,
                    f"{p.article_count} 則（利多 {p.bullish}／利空 {p.bearish}）焦點：{headline}",
                    raw_value=p.article_count,
                    unit="則",
                )
            )
        return signals
