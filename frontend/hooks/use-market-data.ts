"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { DATA_MODE, marketApi } from "@/lib/api";
import type {
  FactorsResponse,
  GlobalScoreResponse,
  HistoryResponse,
  NewsDigest,
  QuotesResponse,
} from "@/types/market";

const REFRESH_MS = Number(process.env.NEXT_PUBLIC_REFRESH_MS ?? (DATA_MODE === "static" ? 300_000 : 60_000));

interface MarketState {
  score: GlobalScoreResponse | null;
  factors: FactorsResponse | null;
  news: NewsDigest | null;
  quotes: QuotesResponse | null;
  history: HistoryResponse | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
}

const settled = <T,>(r: PromiseSettledResult<T>, prev: T | null) => (r.status === "fulfilled" ? r.value : prev);

/**
 * 總分與因子為必要資料（失敗即顯示錯誤）；新聞、行情、歷史為加值資料，
 * 個別失敗時保留上一份並靜默略過，不影響主畫面。
 */
export function useMarketData() {
  const [state, setState] = useState<MarketState>({
    score: null,
    factors: null,
    news: null,
    quotes: null,
    history: null,
    error: null,
    loading: true,
    refreshing: false,
  });
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (force = false) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setState((s) => ({ ...s, refreshing: true }));
    try {
      // force 時只讓第一個請求重算，其他請求吃後端快取，保證是同一份快照
      const score = await marketApi.globalScore(force, ctrl.signal);
      const [factors, news, quotes, history] = await Promise.allSettled([
        marketApi.factors(false, ctrl.signal),
        marketApi.news(ctrl.signal),
        marketApi.quotes(ctrl.signal),
        marketApi.history(ctrl.signal),
      ]);
      if (factors.status === "rejected") throw factors.reason;
      setState((s) => ({
        score,
        factors: factors.value,
        news: settled(news, s.news),
        quotes: settled(quotes, s.quotes),
        history: settled(history, s.history),
        error: null,
        loading: false,
        refreshing: false,
      }));
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setState((s) => ({ ...s, error: (err as Error).message, loading: false, refreshing: false }));
    }
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, REFRESH_MS);
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      abortRef.current?.abort();
    };
  }, [load]);

  return { ...state, refresh: () => load(true) };
}
