/**
 * 與後端 Pydantic Schema 一一對應（backend/app/schemas/*.py）。
 * 欄位維持 snake_case，避免額外的轉換層。
 */

export type FactorCategory = "macro" | "us_tech" | "commodity" | "tw_flow";

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
