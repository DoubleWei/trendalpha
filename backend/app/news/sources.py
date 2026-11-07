"""新聞來源：FinMind TaiwanStockNews（台股）與 yfinance Ticker.news（美股）。"""
import asyncio
import logging
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from app.providers.finmind import FinMindProvider

logger = logging.getLogger(__name__)
TAIPEI = ZoneInfo("Asia/Taipei")


@dataclass(frozen=True)
class RawArticle:
    title: str
    url: str | None
    source: str
    published_at: datetime
    symbol: str
    provider: str


def _parse_dt(value) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value, tz=timezone.utc)
    s = str(value).strip().replace("Z", "+00:00")
    for fmt in (None, "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            dt = datetime.fromisoformat(s) if fmt is None else datetime.strptime(s, fmt)
        except ValueError:
            continue
        return dt if dt.tzinfo else dt.replace(tzinfo=TAIPEI)
    return None


async def finmind_news(fm: FinMindProvider, symbol: str, days: int = 2) -> list[RawArticle]:
    """FinMind TaiwanStockNews 一次只接受單日查詢（start_date），因此逐日抓取。"""
    rows: list[dict] = []
    errors: list[str] = []
    for offset in range(days):
        day = (date.today() - timedelta(days=offset)).isoformat()
        try:
            rows += await fm.query({"dataset": "TaiwanStockNews", "data_id": symbol, "start_date": day})
        except Exception as exc:  # noqa: BLE001
            errors.append(str(exc))
    if not rows and errors:
        raise RuntimeError(errors[0])
    out: list[RawArticle] = []
    for r in rows:
        dt = _parse_dt(r.get("date"))
        title = (r.get("title") or "").strip()
        if not title or not dt:
            continue
        out.append(RawArticle(title, r.get("link"), r.get("source") or "FinMind", dt, symbol, "finmind"))
    return out


def _yf_news_sync(symbol: str) -> list[RawArticle]:
    import yfinance as yf

    items = yf.Ticker(symbol).news or []
    out: list[RawArticle] = []
    for item in items:
        # yfinance 新舊兩種格式都支援：{content:{...}} 或扁平欄位
        c = item.get("content") or item
        title = (c.get("title") or "").strip()
        dt = _parse_dt(c.get("pubDate") or c.get("displayTime") or c.get("providerPublishTime"))
        url = (c.get("canonicalUrl") or {}).get("url") if isinstance(c.get("canonicalUrl"), dict) else c.get("link")
        provider = c.get("provider")
        source = provider.get("displayName") if isinstance(provider, dict) else c.get("publisher") or "Yahoo Finance"
        if title and dt:
            out.append(RawArticle(title, url, source, dt, symbol, "yfinance"))
    return out


async def yfinance_news(symbol: str) -> list[RawArticle]:
    return await asyncio.to_thread(_yf_news_sync, symbol)
