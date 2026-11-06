"""全球總經：聯準會政策利率、美債 10Y 殖利率、美元指數 DXY。數據源：yfinance。

聯準會利率以 ^IRX（13 週美國國庫券殖利率）代表：它緊貼聯邦基金利率，
且每天反映市場對 FOMC 升降息的最新定價，比每 6 週才變動一次的官方利率更即時。
"""
import asyncio
from dataclasses import dataclass

from app.core.scoring import blend, squash
from app.fetchers.base import SnapshotFetcher
from app.fetchers.registry import register_fetcher
from app.schemas.signal import EventSignal, FactorCategory


@dataclass(frozen=True)
class MacroSnapshot:
    fed_rate: float          # 13W T-Bill 殖利率 %（政策利率代理）
    fed_change_bp_90d: float  # 近 60 個交易日（約 3 個月）變動 (bp)
    us10y: float             # 10Y 殖利率 %
    us10y_change_bp_20d: float
    dxy: float
    dxy_change_pct_20d: float


@register_fetcher
class MacroFetcher(SnapshotFetcher[MacroSnapshot]):
    name = "macro"
    category = FactorCategory.MACRO

    async def load_live(self) -> MacroSnapshot:
        irx, tnx, dxy = await asyncio.gather(
            self.ctx.yf.stats("^IRX", lookback_days=60),
            self.ctx.yf.stats("^TNX", lookback_days=20),
            self.ctx.yf.stats("DX-Y.NYB", lookback_days=20),
        )
        return MacroSnapshot(
            fed_rate=irx.last,
            fed_change_bp_90d=irx.change_abs * 100,
            us10y=tnx.last,
            us10y_change_bp_20d=tnx.change_abs * 100,
            dxy=dxy.last,
            dxy_change_pct_20d=dxy.change_pct,
        )

    def load_mock(self) -> MacroSnapshot:
        m = self.ctx.mock
        return MacroSnapshot(
            fed_rate=3.88,
            fed_change_bp_90d=-25,
            us10y=m.around("us10y", 4.12, 0.12),
            us10y_change_bp_20d=m.around("us10y_chg", -8, 18),
            dxy=m.around("dxy", 99.4, 0.8),
            dxy_change_pct_20d=m.around("dxy_chg", -0.6, 1.2),
        )

    def score(self, s: MacroSnapshot) -> list[EventSignal]:
        # 降息 → 資金寬鬆 → 偏多；利率絕對水準越高越壓抑估值
        fed_score = blend((squash(-s.fed_change_bp_90d, 50), 0.7), (squash(3.0 - s.fed_rate, 1.5), 0.3))
        # 殖利率上行 → 科技股估值壓力；4.5% 以上額外懲罰
        y_score = blend((squash(-s.us10y_change_bp_20d, 25), 0.75), (squash(4.5 - s.us10y, 0.5), 0.25))
        # 美元走強 → 新興市場資金外流、台幣貶值 → 外資賣超
        dxy_score = squash(-s.dxy_change_pct_20d, 2.0)

        def trend(chg: float, up: str, down: str) -> str:
            return up if chg > 0 else down

        return [
            self.signal(
                "聯準會利率",
                fed_score,
                0.6,
                f"13W 國庫券 {s.fed_rate:.2f}%，近 3 月 {s.fed_change_bp_90d:+.0f}bp，"
                + trend(-s.fed_change_bp_90d, "寬鬆循環延續", "緊縮壓力仍在"),
                raw_value=s.fed_rate,
                unit="%",
            ),
            self.signal(
                "美債 10Y 殖利率",
                y_score,
                0.7,
                f"{s.us10y:.2f}%，20 日 {s.us10y_change_bp_20d:+.0f}bp，"
                + trend(s.us10y_change_bp_20d, "估值承壓", "估值壓力緩解"),
                raw_value=s.us10y,
                unit="%",
            ),
            self.signal(
                "美元指數 DXY",
                dxy_score,
                0.65,
                f"{s.dxy:.1f}，20 日 {s.dxy_change_pct_20d:+.1f}%，"
                + trend(s.dxy_change_pct_20d, "強勢美元抑制熱錢", "弱勢美元利於資金回流亞洲"),
                raw_value=s.dxy,
            ),
        ]
