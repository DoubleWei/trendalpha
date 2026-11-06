"""原物料 / 風險情緒：黃金、原油、VIX。"""
import asyncio
from dataclasses import dataclass

from app.core.scoring import squash
from app.fetchers.base import SnapshotFetcher
from app.fetchers.registry import register_fetcher
from app.schemas.signal import EventSignal, FactorCategory


@dataclass(frozen=True)
class CommoditySnapshot:
    gold: float
    gold_change_pct_20d: float
    crude: float
    crude_change_pct_20d: float
    vix: float


@register_fetcher
class CommodityFetcher(SnapshotFetcher[CommoditySnapshot]):
    name = "commodity"
    category = FactorCategory.COMMODITY

    async def load_live(self) -> CommoditySnapshot:
        gold, crude, vix = await asyncio.gather(
            self.ctx.yf.stats("GC=F", 20),
            self.ctx.yf.stats("CL=F", 20),
            self.ctx.yf.last("^VIX"),
        )
        return CommoditySnapshot(gold.last, gold.change_pct, crude.last, crude.change_pct, vix)

    def load_mock(self) -> CommoditySnapshot:
        m = self.ctx.mock
        return CommoditySnapshot(
            gold=m.around("gold", 3950, 60),
            gold_change_pct_20d=m.around("gold_chg", 2.0, 4.0),
            crude=m.around("crude", 63.5, 2.5),
            crude_change_pct_20d=m.around("crude_chg", -2.0, 6.0),
            vix=m.around("vix", 17.5, 4.5),
        )

    def score(self, s: CommoditySnapshot) -> list[EventSignal]:
        vix_score = squash(18 - s.vix, 6.0)
        vix_state = "市場極度恐慌" if s.vix > 30 else "避險情緒升溫" if s.vix > 20 else "風險偏好穩定"
        return [
            self.signal(
                "VIX 恐慌指數",
                vix_score,
                0.8,
                f"{s.vix:.1f}，{vix_state}",
                raw_value=s.vix,
            ),
            self.signal(
                "黃金",
                # 黃金急漲通常代表避險資金湧入 → 對風險資產偏空
                squash(-s.gold_change_pct_20d, 6.0),
                0.35,
                f"${s.gold:,.0f}，20 日 {s.gold_change_pct_20d:+.1f}%，"
                + ("避險買盤進駐" if s.gold_change_pct_20d > 3 else "避險需求溫和"),
                raw_value=s.gold,
                unit="USD",
            ),
            self.signal(
                "WTI 原油",
                # 油價急漲 → 通膨與成本壓力；溫和下跌 → 利多製造業毛利
                squash(-s.crude_change_pct_20d, 10.0),
                0.4,
                f"${s.crude:.1f}，20 日 {s.crude_change_pct_20d:+.1f}%，"
                + ("通膨壓力升溫" if s.crude_change_pct_20d > 5 else "成本壓力可控"),
                raw_value=s.crude,
                unit="USD",
            ),
        ]
