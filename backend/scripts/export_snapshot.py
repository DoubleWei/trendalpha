"""把引擎的計算結果匯出成靜態 JSON（給 GitHub Pages 版前端讀取）。

用法：python -m scripts.export_snapshot <輸出目錄>
輸出：global-score.json、factors.json、news.json、quotes.json、history.json
所有外掛都失敗時以非零狀態結束，讓 CI 不覆蓋上一版正常的網站。
"""
import asyncio
import json
import logging
import sys
from pathlib import Path

import httpx

from app.api.deps import build_engine
from app.core.config import get_settings
from app.fetchers.base import FetcherContext
from app.schemas.extras import HistoryPoint, HistoryResponse
from app.services.quotes import QuotesService

logger = logging.getLogger("export")


async def load_previous_history(url: str | None) -> list[HistoryPoint]:
    if not url:
        return []
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(url, params={"t": "ci"})
        if resp.status_code != 200:
            print(f"history: previous file not available ({resp.status_code}), starting fresh")
            return []
        return HistoryResponse.model_validate(resp.json()).points
    except Exception as exc:  # noqa: BLE001
        print(f"history: could not load previous file ({exc!r}), starting fresh")
        return []


def write(out_dir: Path, name: str, model) -> None:
    (out_dir / name).write_text(model.model_dump_json(indent=2), encoding="utf-8")


async def main(out_dir: Path) -> int:
    settings = get_settings()
    ctx = FetcherContext(settings=settings)
    engine = build_engine(settings, ctx)
    engine.history.extend(await load_previous_history(settings.history_url))

    snap, quotes = await asyncio.gather(engine.compute(), QuotesService(ctx).fetch())

    out_dir.mkdir(parents=True, exist_ok=True)
    write(out_dir, "global-score.json", snap.global_score)
    write(out_dir, "factors.json", snap.factors)
    write(out_dir, "quotes.json", quotes)
    write(out_dir, "history.json", HistoryResponse(points=list(engine.history)))
    if news := snap.extras.get("news"):
        write(out_dir, "news.json", news)

    g = snap.global_score
    print(f"mode={g.data_mode} score={g.score:+.1f} ({g.regime_label}) signals={g.signal_count} failed={g.failed_sources}")
    for f in snap.factors.factors:
        print(f"  [{f.label}] {f.score:+.3f}")
        for s in f.signals:
            print(f"     - {s.source_name}: {s.trend_score:+.3f} | {s.description}")
    print(f"quotes={len(quotes.quotes)} history_points={len(engine.history)}")
    if news:
        print(f"news providers={news.providers} articles={len(news.articles)}")
        for a in news.articles[:8]:
            print(f"     · [{a.industry_label}] {a.sentiment:+.2f} {a.title[:60]} ({a.source}) {a.matched}")

    if g.signal_count == 0:
        print("ERROR: every fetcher failed; refusing to publish", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    target = Path(sys.argv[1] if len(sys.argv) > 1 else "out")
    sys.exit(asyncio.run(main(target)))
