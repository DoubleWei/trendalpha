import type {
  FactorsResponse,
  GlobalScoreResponse,
  HistoryResponse,
  NewsDigest,
  QuotesResponse,
} from "@/types/market";

/**
 * 兩種資料模式：
 * - "api"（預設）：呼叫 FastAPI（經 Next rewrites 代理，或以 NEXT_PUBLIC_API_BASE 直連）
 * - "static"：讀取 CI 定時產生的 /data/*.json（GitHub Pages 部署）
 */
export const DATA_MODE = (process.env.NEXT_PUBLIC_DATA_MODE ?? "api") as "api" | "static";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!res.ok) throw new ApiError(res.status, `${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

const apiUrl = (path: string, refresh: boolean) => `${API_BASE}/api/v1${path}${refresh ? "?refresh=true" : ""}`;
// 加上時間戳避開 CDN 快取，確保拿到最新一次 CI 產出的資料
const staticUrl = (file: string) => `${BASE_PATH}/data/${file}?t=${Date.now()}`;

export const marketApi = {
  globalScore: (refresh = false, signal?: AbortSignal) =>
    request<GlobalScoreResponse>(
      DATA_MODE === "static" ? staticUrl("global-score.json") : apiUrl("/market/global-score", refresh),
      { signal },
    ),
  factors: (refresh = false, signal?: AbortSignal) =>
    request<FactorsResponse>(
      DATA_MODE === "static" ? staticUrl("factors.json") : apiUrl("/market/factors", refresh),
      { signal },
    ),
  news: (signal?: AbortSignal) =>
    request<NewsDigest>(DATA_MODE === "static" ? staticUrl("news.json") : apiUrl("/market/news", false), { signal }),
  quotes: (signal?: AbortSignal) =>
    request<QuotesResponse>(DATA_MODE === "static" ? staticUrl("quotes.json") : apiUrl("/market/quotes", false), {
      signal,
    }),
  history: (signal?: AbortSignal) =>
    request<HistoryResponse>(DATA_MODE === "static" ? staticUrl("history.json") : apiUrl("/market/history", false), {
      signal,
    }),
};
