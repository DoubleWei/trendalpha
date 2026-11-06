"""台灣內部籌碼：三大法人買賣超、外資台指期未平倉。數據源：FinMind。"""
import asyncio
from collections import defaultdict
from dataclasses import dataclass

from app.core.scoring import blend, squash
from app.fetchers.base import SnapshotFetcher
from app.fetchers.registry import register_fetcher
from app.schemas.signal import EventSignal, FactorCategory

FOREIGN = {"Foreign_Investor", "Foreign_Dealer_Self"}
TRUST = {"Investment_Trust"}
DEALER = {"Dealer_self", "Dealer_Hedging"}


@dataclass(frozen=True)
class TaiwanFlowSnapshot:
    foreign_net_bn: float   # 今日外資買賣超（億元）
    trust_net_bn: float
    dealer_net_bn: float
    total_net_5d_bn: float  # 三大法人近 5 日合計
    foreign_tx_oi: int      # 外資台指期淨未平倉（口）
    foreign_tx_oi_change: int


@register_fetcher
class TaiwanFlowFetcher(SnapshotFetcher[TaiwanFlowSnapshot]):
    name = "taiwan_flow"
    category = FactorCategory.TW_FLOW

    async def load_live(self) -> TaiwanFlowSnapshot:
        fm = self.ctx.finmind
        assert fm is not None
        inst_rows, fut_rows = await asyncio.gather(
            fm.dataset("TaiwanStockTotalInstitutionalInvestors", days=14),
            fm.dataset("TaiwanFuturesInstitutionalInvestors", days=14, data_id="TX"),
        )

        # 依日期彙總：{date: {group: net}}
        by_date: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
        for r in inst_rows:
            net_bn = (float(r["buy"]) - float(r["sell"])) / 1e8
            group = "f" if r["name"] in FOREIGN else "t" if r["name"] in TRUST else "d" if r["name"] in DEALER else None
            if group:
                by_date[r["date"]][group] += net_bn
        dates = sorted(by_date)
        if not dates:
            sample = inst_rows[0] if inst_rows else {}
            raise ValueError(f"no institutional rows (rows={len(inst_rows)}, sample={sample})")
        today = by_date[dates[-1]]
        total_5d = sum(sum(by_date[d].values()) for d in dates[-5:])

        oi_by_date = {
            r["date"]: int(r["long_open_interest_balance_volume"]) - int(r["short_open_interest_balance_volume"])
            for r in fut_rows
            if "外資" in str(r.get("institutional_investors", ""))
        }
        oi_dates = sorted(oi_by_date)
        if len(oi_dates) < 2:
            sample = fut_rows[0] if fut_rows else {}
            raise ValueError(f"no foreign TX OI rows (rows={len(fut_rows)}, sample={sample})")

        return TaiwanFlowSnapshot(
            foreign_net_bn=today["f"],
            trust_net_bn=today["t"],
            dealer_net_bn=today["d"],
            total_net_5d_bn=total_5d,
            foreign_tx_oi=oi_by_date[oi_dates[-1]],
            foreign_tx_oi_change=oi_by_date[oi_dates[-1]] - oi_by_date[oi_dates[-2]],
        )

    def load_mock(self) -> TaiwanFlowSnapshot:
        m = self.ctx.mock
        return TaiwanFlowSnapshot(
            foreign_net_bn=m.around("tw_f", 85, 180),
            trust_net_bn=m.around("tw_t", 22, 30),
            dealer_net_bn=m.around("tw_d", -5, 40),
            total_net_5d_bn=m.around("tw_5d", 260, 500),
            foreign_tx_oi=int(m.around("tx_oi", -12000, 14000)),
            foreign_tx_oi_change=int(m.around("tx_oi_chg", 1500, 4500)),
        )

    def score(self, s: TaiwanFlowSnapshot) -> list[EventSignal]:
        today_total = s.foreign_net_bn + s.trust_net_bn + s.dealer_net_bn
        flow_score = blend((squash(today_total, 150), 0.4), (squash(s.total_net_5d_bn, 400), 0.6))
        # 外資淨空單偏多是常態，故以 -5,000 口為中性基準；當日增減代表最新態度
        oi_score = blend((squash(s.foreign_tx_oi + 5000, 15000), 0.6), (squash(s.foreign_tx_oi_change, 4000), 0.4))
        return [
            self.signal(
                "三大法人買賣超",
                flow_score,
                0.8,
                f"今日 {today_total:+.0f} 億（外資 {s.foreign_net_bn:+.0f}／投信 {s.trust_net_bn:+.0f}／"
                f"自營 {s.dealer_net_bn:+.0f}），5 日 {s.total_net_5d_bn:+.0f} 億",
                raw_value=today_total,
                unit="億",
            ),
            self.signal(
                "外資台指期未平倉",
                oi_score,
                0.9,
                f"淨{'多' if s.foreign_tx_oi >= 0 else '空'}單 {abs(s.foreign_tx_oi):,} 口，"
                f"單日{'增' if s.foreign_tx_oi_change >= 0 else '減'}碼多方 {abs(s.foreign_tx_oi_change):,} 口",
                raw_value=s.foreign_tx_oi,
                unit="口",
            ),
        ]
