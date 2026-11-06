"""美國科技股：費城半導體 SOX、那斯達克、台積電 ADR 溢價率。"""
import asyncio

import pandas as pd
from dataclasses import dataclass

from app.core.scoring import squash
from app.fetchers.base import SnapshotFetcher
from app.fetchers.registry import register_fetcher
from app.schemas.signal import EventSignal, FactorCategory

ADR_RATIO = 5  # 1 股 TSM ADR = 5 股 2330


@dataclass(frozen=True)
class GlobalMarketSnapshot:
    sox: float
    sox_change_pct_5d: float
    nasdaq: float
    nasdaq_change_pct_5d: float
    adr_premium_pct: float      # 當前 ADR 溢價率 %
    adr_premium_avg_pct: float  # 歷史基準溢價率 %


@register_fetcher
class GlobalMarketFetcher(SnapshotFetcher[GlobalMarketSnapshot]):
    name = "global_market"
    category = FactorCategory.US_TECH

    async def load_live(self) -> GlobalMarketSnapshot:
        yf = self.ctx.yf
        sox, ndx, tsm, tw2330, usdtwd = await asyncio.gather(
            yf.stats("^SOX", 5),
            yf.stats("^IXIC", 5),
            yf.closes("TSM"),
            yf.closes("2330.TW"),
            yf.closes("TWD=X"),
        )
        # 台美交易日不同：以日期對齊後向前填補，計算每日 ADR 溢價率序列
        df = pd.concat({"tsm": tsm, "tw": tw2330, "fx": usdtwd}, axis=1).sort_index().ffill().dropna()
        premium = (df["tsm"] * df["fx"] / ADR_RATIO / df["tw"] - 1) * 100
        if len(premium) < 20:
            raise ValueError(f"insufficient ADR history: {len(premium)} rows")
        return GlobalMarketSnapshot(
            sox=sox.last,
            sox_change_pct_5d=sox.change_pct,
            nasdaq=ndx.last,
            nasdaq_change_pct_5d=ndx.change_pct,
            adr_premium_pct=float(premium.iloc[-1]),
            adr_premium_avg_pct=float(premium.iloc[-60:].mean()),  # 滾動 60 日平均作為基準
        )

    def load_mock(self) -> GlobalMarketSnapshot:
        m = self.ctx.mock
        return GlobalMarketSnapshot(
            sox=m.around("sox", 6850, 120),
            sox_change_pct_5d=m.around("sox_chg", 2.4, 3.5),
            nasdaq=m.around("ndx", 22150, 250),
            nasdaq_change_pct_5d=m.around("ndx_chg", 1.1, 2.0),
            adr_premium_pct=m.around("adr", 21.5, 3.0),
            adr_premium_avg_pct=18.0,
        )

    def score(self, s: GlobalMarketSnapshot) -> list[EventSignal]:
        adr_dev = s.adr_premium_pct - s.adr_premium_avg_pct
        return [
            self.signal(
                "費城半導體 SOX",
                squash(s.sox_change_pct_5d, 4.0),
                0.9,
                f"{s.sox:,.0f}，5 日 {s.sox_change_pct_5d:+.1f}%，"
                + ("半導體動能強勁" if s.sox_change_pct_5d > 0 else "半導體族群回檔"),
                raw_value=s.sox_change_pct_5d,
                unit="%",
            ),
            self.signal(
                "那斯達克",
                squash(s.nasdaq_change_pct_5d, 3.0),
                0.7,
                f"{s.nasdaq:,.0f}，5 日 {s.nasdaq_change_pct_5d:+.1f}%",
                raw_value=s.nasdaq_change_pct_5d,
                unit="%",
            ),
            self.signal(
                "台積電 ADR 溢價",
                squash(adr_dev, 4.0),
                0.85,
                f"溢價 {s.adr_premium_pct:.1f}% vs 60 日均 {s.adr_premium_avg_pct:.1f}%，"
                + ("美股資金追價台積電" if adr_dev > 0 else "ADR 溢價收斂，留意權值股賣壓"),
                raw_value=s.adr_premium_pct,
                unit="%",
            ),
        ]
