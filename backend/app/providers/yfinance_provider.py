"""yfinance 接口。yfinance 為同步函式庫，統一以 asyncio.to_thread 包裝避免阻塞事件迴圈。"""
import asyncio
import time
from dataclasses import dataclass

import pandas as pd


@dataclass(frozen=True)
class PriceStats:
    last: float
    change_pct: float  # 相對 lookback 個交易日前的 % 變動
    change_abs: float  # 絕對變動
    as_of: str         # 最後一筆資料日期


class YFinanceProvider:
    def __init__(self, ttl_sec: int = 300, retries: int = 2) -> None:
        self.ttl_sec = ttl_sec
        self.retries = retries
        self._cache: dict[str, tuple[float, pd.Series]] = {}

    async def closes(self, ticker: str) -> pd.Series:
        """日收盤價序列（約半年），index 為不含時區的日期。同一 ticker 於 TTL 內只抓一次。"""
        hit = self._cache.get(ticker)
        if hit and time.monotonic() - hit[0] < self.ttl_sec:
            return hit[1]
        series = await asyncio.to_thread(self._closes_sync, ticker, self.retries)
        self._cache[ticker] = (time.monotonic(), series)
        return series

    async def stats(self, ticker: str, lookback_days: int = 5) -> PriceStats:
        closes = await self.closes(ticker)
        if len(closes) <= lookback_days:
            raise ValueError(f"insufficient history for {ticker}: {len(closes)} rows")
        last = float(closes.iloc[-1])
        prev = float(closes.iloc[-1 - lookback_days])
        return PriceStats(last, (last / prev - 1) * 100, last - prev, closes.index[-1].date().isoformat())

    async def last(self, ticker: str) -> float:
        return float((await self.closes(ticker)).iloc[-1])

    @staticmethod
    def _closes_sync(ticker: str, retries: int) -> pd.Series:
        import yfinance as yf

        last_err: Exception | None = None
        for attempt in range(retries + 1):
            try:
                hist = yf.Ticker(ticker).history(period="6mo", interval="1d", auto_adjust=False)
                closes = hist["Close"].dropna()
                if closes.empty:
                    raise ValueError(f"yfinance returned no data for {ticker}")
                idx = closes.index
                if getattr(idx, "tz", None) is not None:
                    idx = idx.tz_localize(None)
                closes.index = idx.normalize()
                return closes
            except Exception as exc:  # noqa: BLE001
                last_err = exc
                time.sleep(1.5 * (attempt + 1))
        raise RuntimeError(f"yfinance {ticker} failed: {last_err}")
