"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { DATA_MODE, marketApi } from "@/lib/api";
import type { FactorsResponse, GlobalScoreResponse } from "@/types/market";

const REFRESH_MS = Number(process.env.NEXT_PUBLIC_REFRESH_MS ?? (DATA_MODE === "static" ? 300_000 : 60_000));

interface MarketState {
  score: GlobalScoreResponse | null;
  factors: FactorsResponse | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
}

/** 同步拉取兩個端點並定時輪詢；頁面隱藏時暫停，回到前景立即更新。 */
export function useMarketData() {
  const [state, setState] = useState<MarketState>({
    score: null,
    factors: null,
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
      // force 時只讓第一個請求重算，第二個請求直接吃後端快取，保證兩者是同一份快照
      const score = await marketApi.globalScore(force, ctrl.signal);
      const factors = await marketApi.factors(false, ctrl.signal);
      setState({ score, factors, error: null, loading: false, refreshing: false });
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
