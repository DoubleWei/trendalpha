"use client";

import { AlertTriangle, RefreshCw, Sparkles } from "lucide-react";

import { SpotlightCard } from "@/components/spotlight-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DATA_MODE } from "@/lib/api";
import { cn, signed, timeAgo, toneOf } from "@/lib/utils";
import type { FactorsResponse, GlobalScoreResponse } from "@/types/market";

const FETCHER_LABELS: Record<string, string> = {
  macro: "全球總經（yfinance）",
  global_market: "美國科技股（yfinance）",
  commodity: "原物料市場（yfinance）",
  taiwan_flow: "台灣內部籌碼（FinMind）",
};

interface AISummaryCardProps {
  score: GlobalScoreResponse | null;
  factors: FactorsResponse | null;
  refreshing: boolean;
  onRefresh: () => void;
}

export function AISummaryCard({ score, factors, refreshing, onRefresh }: AISummaryCardProps) {
  const drivers = [...(factors?.factors ?? [])].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  return (
    <SpotlightCard tone={score ? toneOf(score.score, 5) : "neutral"} className="overflow-hidden">
      {/* 頂部漸層細線 */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/60 to-transparent" />
      <div className="relative p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md border bg-gradient-to-br from-violet-500/20 to-bull/10">
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
            </span>
            <h2 className="text-sm font-medium">AI 全球情勢分析</h2>
            {score && <span className="hidden text-xs text-muted-foreground sm:inline">· 更新於 {timeAgo(score.generated_at)}</span>}
          </div>
          <Button variant="ghost" size="sm" onClick={onRefresh} disabled={refreshing} className="text-muted-foreground">
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            {DATA_MODE === "static" ? "重新整理" : "重新計算"}
          </Button>
        </div>

        {score ? (
          <p className="mt-4 text-[15px] leading-7 text-foreground/85">{score.summary}</p>
        ) : (
          <div className="mt-4 space-y-2">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-11/12" />
            <div className="skeleton h-4 w-3/5" />
          </div>
        )}

        {drivers.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t pt-4">
            <span className="text-xs text-muted-foreground">維度貢獻</span>
            {drivers.map((f) => (
              <Badge key={f.category} tone={toneOf(f.contribution, 0.5)}>
                {f.label}
                <span className="font-mono">{signed(f.contribution, 1)}</span>
              </Badge>
            ))}
          </div>
        )}

        {score && score.failed_sources.length > 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
            <AlertTriangle className="h-3.5 w-3.5" />
            以下數據源本次抓取失敗，已排除於總分之外：{score.failed_sources.map((n) => FETCHER_LABELS[n] ?? n).join("、")}
          </div>
        )}
      </div>
    </SpotlightCard>
  );
}
