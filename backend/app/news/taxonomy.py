"""產業分類：每個產業對應要追蹤新聞的台股（FinMind）與美股（yfinance）代碼。

新增產業或追蹤標的，只要改這個檔案。注意 FinMind 免金鑰額度約 300 次/小時，
台股代碼總數 × 每小時執行次數請控制在額度內。
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class Industry:
    key: str
    label: str
    tw_symbols: tuple[str, ...]  # FinMind TaiwanStockNews
    us_symbols: tuple[str, ...]  # yfinance Ticker.news
    importance: float            # 該產業對加權指數的影響程度（約略對應市值占比）
    aliases: tuple[str, ...] = ()  # 美股新聞相關性過濾：標題需提及其中之一（不分大小寫）


INDUSTRIES: tuple[Industry, ...] = (
    Industry(
        "semis", "半導體", ("2330", "2454", "2303"), ("NVDA", "TSM", "AMD", "ASML"), 1.0,
        ("nvidia", "nvda", "tsmc", "taiwan semi", "amd", "asml", "chip", "semiconductor", "foundry",
         "wafer", "gpu", "blackwell", "rubin", "hbm", "lithography"),
    ),
    Industry(
        "ai_server", "AI 伺服器", ("2382", "3231", "6669"), ("SMCI", "DELL"), 0.8,
        ("super micro", "supermicro", "smci", "dell", "server", "data center", "datacenter",
         "ai infrastructure", "hyperscaler", "capex"),
    ),
    Industry("ems", "電子代工", ("2317", "4938"), ("AAPL",), 0.6,
             ("apple", "aapl", "iphone", "foxconn", "hon hai", "pegatron", "mac", "ipad")),
    Industry("network", "網通 / 光通訊", ("2345", "3017"), ("ANET", "CSCO"), 0.45,
             ("arista", "anet", "cisco", "csco", "network", "switch", "optical", "ethernet", "800g", "1.6t")),
    Industry("finance", "金融", ("2881", "2882"), (), 0.5),
    Industry("shipping", "航運 / 傳產", ("2603", "1301"), (), 0.35),
)

INDUSTRY_BY_KEY = {i.key: i for i in INDUSTRIES}
