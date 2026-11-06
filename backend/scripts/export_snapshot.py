"""把引擎的計算結果匯出成靜態 JSON（給 GitHub Pages 版前端讀取）。

用法：python -m scripts.export_snapshot <輸出目錄>
所有外掛都失敗時以非零狀態結束，讓 CI 不覆蓋上一版正常的網站。
"""
import asyncio
import json
import sys
from pathlib import Path

from app.api.deps import build_engine
from app.core.config import get_settings


async def main(out_dir: Path) -> int:
    settings = get_settings()
    engine = build_engine(settings)
    snap = await engine.compute()

    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "global-score.json").write_text(snap.global_score.model_dump_json(indent=2), encoding="utf-8")
    (out_dir / "factors.json").write_text(snap.factors.model_dump_json(indent=2), encoding="utf-8")

    g = snap.global_score
    print(f"mode={g.data_mode} score={g.score:+.1f} ({g.regime_label}) signals={g.signal_count} failed={g.failed_sources}")
    for f in snap.factors.factors:
        print(f"  [{f.label}] {f.score:+.3f}")
        for s in f.signals:
            print(f"     - {s.source_name}: {s.trend_score:+.3f} | {s.description}")

    if g.signal_count == 0:
        print("ERROR: every fetcher failed; refusing to publish", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    target = Path(sys.argv[1] if len(sys.argv) > 1 else "out")
    sys.exit(asyncio.run(main(target)))
