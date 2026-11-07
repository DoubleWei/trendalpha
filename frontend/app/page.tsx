"use client";

import { useState } from "react";
import { WifiOff } from "lucide-react";

import { AISummaryCard } from "@/components/dashboard/ai-summary-card";
import { IndustryHeatmap } from "@/components/dashboard/industry-heatmap";
import { NewsFeed } from "@/components/dashboard/news-feed";
import { ScoreHistoryChart } from "@/components/dashboard/score-history-chart";
import { SignalContribution } from "@/components/dashboard/signal-contribution";
import { TickerTape } from "@/components/dashboard/ticker-tape";
import { TrendGauge } from "@/components/dashboard/trend-gauge";
import { WorldPulseGrid } from "@/components/dashboard/world-pulse-grid";
import { Card } from "@/components/ui/card";
import { useMarketData } from "@/hooks/use-market-data";
import { DATA_MODE } from "@/lib/api";
import { timeAgo } from "@/lib/utils";

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { score, factors, news, quotes, history, error, refreshing, refresh } = useMarketData();
  const [industry, setIndustry] = useState<string | null>(null);

  return (
    <div className="space-y-10">
      {/* Hero */}
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
          聚合總經、美股科技、原物料、台灣籌碼與產業新聞五大維度，動態加權出台股多空方向。
        </p>
      </section>

      <TickerTape data={quotes} />

      {error && (
        <div className="mx-auto flex max-w-2xl items-center gap-2 rounded-lg border border-bear/30 bg-bear/10 px-4 py-3 text-sm text-bear">
          <WifiOff className="h-4 w-4 shrink-0" />
          {DATA_MODE === "static"
            ? `無法載入最新數據（${error}），請稍後再試。`
            : `無法連線至 TrendAlpha 引擎（${error}）。請確認後端已啟動於 BACKEND_URL。`}
        </div>
      )}

      {/* 主儀表板：總分 + AI 摘要 | 走勢 + 貢獻拆解 */}
      <section className="grid animate-fade-up gap-6 [animation-delay:120ms] lg:grid-cols-12">
        <div className="min-w-0 space-y-6 lg:col-span-7">
          <Card className="bg-card/40 px-4 pb-4 pt-6 backdrop-blur-sm">
            <TrendGauge data={score} />
          </Card>
          <AISummaryCard score={score} factors={factors} refreshing={refreshing} onRefresh={refresh} />
        </div>
        <div className="min-w-0 space-y-6 lg:col-span-5">
          <ScoreHistoryChart data={history} />
          <SignalContribution data={factors} />
        </div>
      </section>

      {/* 全球脈搏 */}
      <WorldPulseGrid data={factors} />

      {/* 產業新聞 */}
      <section>
        <SectionTitle
          title="Industry Radar"
          subtitle="FinMind 台股新聞 × yfinance 美股新聞，依產業聚合情緒（越近期的新聞權重越高）"
        />
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-5">
            <IndustryHeatmap data={news} selected={industry} onSelect={setIndustry} />
          </div>
          <div className="min-w-0 lg:col-span-7">
            <NewsFeed data={news} industry={industry} onIndustryChange={setIndustry} />
          </div>
        </div>
      </section>

      <footer className="border-t pt-6 text-xs leading-6 text-muted-foreground">
        數據來源：yfinance（美股、指數、匯率、商品、美股新聞）、FinMind（三大法人、台指期未平倉、台股新聞）。
        新聞情緒以中英文財經詞典判讀標題，僅供參考，不構成投資建議。
      </footer>
    </div>
  );
}
