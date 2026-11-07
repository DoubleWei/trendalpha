/**
 * 與後端 Pydantic Schema 一一對應（backend/app/schemas/*.py）。
 * 欄位維持 snake_case，避免額外的轉換層。
 */

export type FactorCategory = "macro" | "us_tech" | "commodity" | "tw_flow" | "news";

export type Regime =
  | "extreme_bull"
  | "strong_bull"
  | "mild_bull"
  | "neutral"
  | "mild_bear"
  | "strong_bear"
  | "extreme_bear";

/** 對應 EventSignal */
export interface EventSignal {
  source_name: string;
  /** -1.0 ~ +1.0 */
  trend_score: number;
  /** 0.0 ~ 1.0 */
  weight: number;
  description: string;
  category: FactorCategory | null;
  raw_value: number | null;
  unit: string | null;
}

/** GET /api/v1/market/global-score */
export interface GlobalScoreResponse {
  /** -100 ~ +100 */
  score: number;
  regime: Regime;
  regime_label: string;
  /** 0 ~ 1 */
  confidence: number;
  summary: string;
  signal_count: number;
  failed_sources: string[];
  data_mode: "live" | "mock";
  generated_at: string;
}

export interface FactorItem {
  category: FactorCategory;
  label: string;
  /** -1 ~ +1 */
  score: number;
  weight_share: number;
  contribution: number;
  is_extreme: boolean;
  signals: EventSignal[];
}

/** GET /api/v1/market/factors */
export interface FactorsResponse {
  factors: FactorItem[];
  extreme_threshold: number;
  generated_at: string;
}

/** GET /api/v1/market/news（對應 backend/app/schemas/news.py） */
export interface NewsArticle {
  title: string;
  url: string | null;
  source: string;
  published_at: string;
  industry: string;
  industry_label: string;
  symbols: string[];
  /** -1 ~ +1 */
  sentiment: number;
  matched: string[];
  provider: "finmind" | "yfinance" | "mock";
}

export interface IndustryPulse {
  key: string;
  label: string;
  score: number;
  article_count: number;
  bullish: number;
  bearish: number;
  top_headline: string | null;
}

export interface NewsDigest {
  industries: IndustryPulse[];
  articles: NewsArticle[];
  providers: Record<string, number>;
  generated_at: string;
}

/** GET /api/v1/market/quotes（對應 backend/app/schemas/extras.py） */
export interface Quote {
  symbol: string;
  name: string;
  last: number;
  change_pct: number;
  as_of: string;
}

export interface QuotesResponse {
  quotes: Quote[];
  generated_at: string;
}

/** GET /api/v1/market/history */
export interface HistoryPoint {
  t: string;
  score: number;
  regime_label: string;
}

export interface HistoryResponse {
  points: HistoryPoint[];
}
