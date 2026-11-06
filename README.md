# TrendAlpha — 台股全球趨勢預測

收集全球總經、美股、原物料和台灣籌碼的事件，加權算出台股大盤的多空總分（-100 ~ +100）。

## 目錄結構

```
trendalpha/
├── backend/                          # Python FastAPI
│   ├── app/
│   │   ├── main.py                   # create_app()、lifespan 建立引擎、CORS
│   │   ├── core/
│   │   │   ├── config.py             # Settings（TA_ 環境變數）
│   │   │   └── scoring.py            # clamp / squash(tanh) / blend
│   │   ├── schemas/
│   │   │   ├── signal.py             # EventSignal、FactorCategory
│   │   │   └── market.py             # GlobalScoreResponse、FactorsResponse
│   │   ├── providers/                # 外部數據接口（外掛共用）
│   │   │   ├── yfinance_provider.py  # 美股 / 期貨 / 匯率
│   │   │   ├── finmind.py            # 台股籌碼
│   │   │   ├── fred.py               # 聯準會利率等總經序列
│   │   │   └── mock.py               # 可重現的模擬行情
│   │   ├── fetchers/
│   │   │   ├── base.py               # BaseEventFetcher、SnapshotFetcher、FetcherContext
│   │   │   ├── registry.py           # @register_fetcher、FetcherFactory、autodiscover
│   │   │   └── plugins/              # ★ 新外掛放這裡，啟動時自動載入
│   │   │       ├── macro.py          # MacroFetcher
│   │   │       ├── global_market.py  # GlobalMarketFetcher
│   │   │       ├── commodity.py      # CommodityFetcher
│   │   │       └── taiwan_flow.py    # TaiwanFlowFetcher
│   │   ├── engine/
│   │   │   ├── trend_matrix.py       # TrendMatrixEngine（並行、容錯、TTL 快取、聚合）
│   │   │   └── summarizer.py         # Summarizer 介面（目前是規則式，之後可換 LLM）
│   │   └── api/
│   │       ├── deps.py               # 依賴注入 EngineDep
│   │       └── v1/market.py          # /global-score、/factors、/fetchers
│   └── tests/test_engine.py
└── frontend/                         # Next.js 14 App Router
    ├── app/{layout,page}.tsx, globals.css
    ├── components/
    │   ├── navbar.tsx                # 品牌、導覽、⌘K 商品搜尋、主題切換
    │   ├── spotlight-card.tsx        # 跟隨滑鼠的 Hover 發光卡片
    │   ├── dashboard/
    │   │   ├── trend-gauge.tsx       # 240° SVG 儀表板
    │   │   ├── ai-summary-card.tsx   # AI 摘要 + 維度貢獻
    │   │   └── world-pulse-grid.tsx  # 四維度卡片 + 極端值警示
    │   └── ui/                       # shadcn/ui 元件（card/button/input/badge/trend-progress）
    ├── hooks/                        # use-market-data（輪詢）、use-animated-number
    ├── lib/{api,utils}.ts
    └── types/market.ts               # 對應後端 Pydantic Schema
```

## 啟動

```bash
cd backend && python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000      # 文件：http://localhost:8000/docs
pytest -q
```

```bash
cd frontend && npm install && npm run dev      # http://localhost:3000（/api/v1 透過 rewrites 代理到 8000）
```

## 數據來源

| 維度 | 來源 | 商品代碼 / 資料集 |
|---|---|---|
| 全球總經 | yfinance | `^IRX`（13 週國庫券，聯準會政策利率代理）、`^TNX`、`DX-Y.NYB` |
| 美國科技股 | yfinance | `^SOX`、`^IXIC`、`TSM` + `2330.TW` + `TWD=X`（ADR 溢價，對比 60 日均值） |
| 原物料市場 | yfinance | `GC=F`、`CL=F`、`^VIX` |
| 台灣內部籌碼 | FinMind | `TaiwanStockTotalInstitutionalInvestors`、`TaiwanFuturesInstitutionalInvestors`（TX） |

預設就使用真實數據（`TA_USE_LIVE_DATA=true`）。某個數據源抓取失敗時，該外掛會列入 `failed_sources` 並排除在總分之外，不會用模擬數據頂替。只有在本機開發時設定 `TA_USE_LIVE_DATA=false`，才會使用 Mock。

FinMind 不帶 token 也能使用，但有頻率限制。若要提高額度，請到 repo 的 Settings → Secrets and variables → Actions 新增 `FINMIND_TOKEN`。

## 部署（GitHub Pages）

`.github/workflows/deploy.yml` 在每次 push 和每 30 分鐘排程時執行：

1. 跑後端測試。
2. `python -m scripts.export_snapshot` 用 yfinance / FinMind 計算總分，輸出 `global-score.json`、`factors.json`。
3. `STATIC_EXPORT=1 npm run build` 產生靜態網站，讀取上一步產出的 JSON。
4. 發佈到 GitHub Pages。如果所有數據源都失敗，就不發佈，網站保留上一版。

要手動更新，可到 Actions → Update data & deploy → Run workflow。

之後若需要即時 API（例如 `?refresh=true`），可把 `backend/` 部署到 Render、Fly.io 等服務，並把前端的 `NEXT_PUBLIC_API_BASE` 指向它。

## 新增外掛（3 步）

1. 在 `backend/app/fetchers/plugins/` 新增檔案：

```python
@register_fetcher
class AINewsFetcher(BaseEventFetcher):
    name = "ai_news"
    category = FactorCategory.MACRO

    async def fetch_signals(self) -> list[EventSignal]:
        sentiment = await my_llm_sentiment()          # -1 ~ 1
        return [self.signal("AI 新聞情緒", sentiment, 0.5, "地緣政治緊張緩解")]
```

2. 把 `"ai_news"` 加進 `TA_ENABLED_FETCHERS`。
3. 重啟服務。引擎、API 和前端都不用改。

若要新增第五個維度：在 `FactorCategory`、`CATEGORY_LABELS` 和前端的 `META`、`FactorCategory` 型別中各加一筆。

## 計分模型

- 單一訊號：`trend_score ∈ [-1,1]`，`weight ∈ [0,1]`，再乘上 `TA_CATEGORY_MULTIPLIERS` 中該維度的倍數
- 總分 = Σ(score·w) / Σw × 100
- 共識度 = |Σ score·w| / Σ |score|·w
- 維度分數的絕對值 > 0.8 時，卡片邊框會閃爍警示
