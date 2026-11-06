"use client";

import { WifiOff } from "lucide-react";

import { AISummaryCard } from "@/components/dashboard/ai-summary-card";
import { TrendGauge } from "@/components/dashboard/trend-gauge";
import { WorldPulseGrid } from "@/components/dashboard/world-pulse-grid";
import { useMarketData } from "@/hooks/use-market-data";
import { DATA_MODE } from "@/lib/api";
import { timeAgo } from "@/lib/utils";

export default function DashboardPage() {
  const { score, factors, error, refreshing, refresh } = useMarketData();

  return (
    <div className="space-y-12">
      {/* Hero 標題 */}
      <section className="animate-fade-up text-center">
        <span className="inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-bull" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-bull" />
          </span>
          {score?.data_mode === "mock" ? "Mock 模擬數據" : "Live · yfinance × FinMind"}
          {score && <> · 資料計算於 {timeAgo(score.generated_at)}</>}
          {DATA_MODE === "static" && " · 每 30 分鐘更新"}
        </span>
        <h1 className="mt-4 bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
          台股全球趨勢預測
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          聚合總經、美股科技、原物料與台灣籌碼四大維度，動態加權出台股多空方向。
        </p>
      </section>

      {error && (
        <div className="mx-auto flex max-w-2xl items-center gap-2 rounded-lg border border-bear/30 bg-bear/10 px-4 py-3 text-sm text-bear">
          <WifiOff className="h-4 w-4 shrink-0" />
          {DATA_MODE === "static"
            ? `無法載入最新數據（${error}），請稍後再試。`
            : `無法連線至 TrendAlpha 引擎（${error}）。請確認後端已啟動於 BACKEND_URL。`}
        </div>
      )}

      {/* 預測總分儀表板 + AI 摘要 */}
      <section className="mx-auto max-w-3xl animate-fade-up space-y-6 [animation-delay:120ms]">
        <TrendGauge data={score} />
        <AISummaryCard score={score} factors={factors} refreshing={refreshing} onRefresh={refresh} />
      </section>

      {/* 全球脈搏網格 */}
      <WorldPulseGrid data={factors} />
    </div>
  );
}
