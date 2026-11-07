"""行情跑馬燈：主要台美股、指數、商品的最新價與日漲跌（yfinance）。"""
import asyncio
import logging
import random
import time
from datetime import date, datetime, timezone

from app.fetchers.base import FetcherContext
from app.schemas.extras import Quote, QuotesResponse

logger = logging.getLogger(__name__)

QUOTE_SYMBOLS: list[tuple[str, str]] = [
    ("^TWII", "加權指數"),
    ("2330.TW", "台積電"),
    ("2317.TW", "鴻海"),
    ("2454.TW", "聯發科"),
    ("^SOX", "費城半導體"),
    ("^IXIC", "那斯達克"),
    ("^GSPC", "S&P 500"),
    ("NVDA", "NVIDIA"),
    ("TSM", "台積電 ADR"),
    ("^VIX", "VIX"),
    ("^TNX", "美債 10Y"),
    ("DX-Y.NYB", "美元指數"),
    ("TWD=X", "美元/台幣"),
    ("GC=F", "黃金"),
    ("CL=F", "原油"),
]

_MOCK_BASE = {"^TWII": 27850, "2330.TW": 1450, "2317.TW": 228, "2454.TW": 1385, "^SOX": 6850, "^IXIC": 22150,
              "^GSPC": 6720, "NVDA": 186, "TSM": 298, "^VIX": 17.5, "^TNX": 4.12, "DX-Y.NYB": 99.4,
              "TWD=X": 30.6, "GC=F": 3950, "CL=F": 63.5}


class QuotesService:
    def __init__(self, ctx: FetcherContext) -> None:
        self.ctx = ctx

    async def fetch(self) -> QuotesResponse:
        if not self.ctx.settings.use_live_data:
            rng = random.Random(int(time.time() // 60))
            quotes = [Quote(symbol=s, name=n, last=_MOCK_BASE[s] * (1 + rng.uniform(-0.01, 0.01)),
                            change_pct=rng.uniform(-2.5, 2.5), as_of=date.today().isoformat())
                      for s, n in QUOTE_SYMBOLS]
            return QuotesResponse(quotes=quotes, generated_at=datetime.now(timezone.utc))

        async def one(symbol: str, name: str) -> Quote | None:
            try:
                st = await self.ctx.yf.stats(symbol, 1)
            except Exception as exc:  # noqa: BLE001
                logger.warning("quote %s failed: %r", symbol, exc)
                return None
            return Quote(symbol=symbol, name=name, last=round(st.last, 4), change_pct=round(st.change_pct, 3), as_of=st.as_of)

        results = await asyncio.gather(*(one(s, n) for s, n in QUOTE_SYMBOLS))
        return QuotesResponse(quotes=[q for q in results if q], generated_at=datetime.now(timezone.utc))
