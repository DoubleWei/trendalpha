"use client";

import { Cpu, Flame, Globe2, Landmark, Newspaper, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";

import { SpotlightCard } from "@/components/spotlight-card";
import { TrendProgress } from "@/components/ui/trend-progress";
import { cn, signed, toneOf, toneText } from "@/lib/utils";
import type { FactorCategory, FactorItem, FactorsResponse } from "@/types/market";

const META: Record<FactorCategory, { icon: LucideIcon; en: string }> = {
  macro: { icon: Globe2, en: "Global Macro" },
  us_tech: { icon: Cpu, en: "US Tech" },
  commodity: { icon: Flame, en: "Commodities" },
  tw_flow: { icon: Landmark, en: "TW Capital Flow" },
  news: { icon: Newspaper, en: "Industry News" },
};

function PulseCard({ factor, index }: { factor: FactorItem; index: number }) {
  const { icon: Icon, en } = META[factor.category];
  const tone = toneOf(factor.score);
  const Trend = factor.score >= 0 ? TrendingUp : TrendingDown;

  return (
    <SpotlightCard
      tone={tone}
      style={{ animationDelay: `${index * 80}ms` }}
      className={cn(
        "animate-fade-up",
        factor.is_extreme && (factor.score > 0 ? "animate-alert-bull border-bull/50" : "animate-alert-bear border-bear/50"),
      )}
    >
      <div className="relative p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg border bg-muted/50 transition-colors group-hover:bg-muted">
              <Icon className={cn("h-4 w-4", toneText[tone])} />
            </span>
            <div>
              <h3 className="text-sm font-medium leading-tight">{factor.label}</h3>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{en}</p>
            </div>
          </div>

          {factor.is_extreme && (
            <span className={cn("flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider", toneText[tone])}>
              <span className="relative flex h-2 w-2">
                <span className={cn("absolute inline-flex h-full w-full animate-ping-slow rounded-full", tone === "bull" ? "bg-bull" : "bg-bear")} />
                <span className={cn("relative inline-flex h-2 w-2 rounded-full", tone === "bull" ? "bg-bull" : "bg-bear")} />
              </span>
              Extreme
            </span>
          )}
        </div>

        <div className="mt-5 flex items-end justify-between">
          <span className={cn("font-mono text-3xl font-semibold tracking-tight tabular", toneText[tone])}>
            {signed(factor.score, 2)}
          </span>
          <span className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Trend className={cn("h-3.5 w-3.5", toneText[tone])} />
            權重 {(factor.weight_share * 100).toFixed(0)}%
          </span>
        </div>

        <TrendProgress value={factor.score} className="mt-4" />
        <div className="mt-1.5 flex justify-between font-mono text-[10px] text-muted-foreground/70">
          <span>-1.0</span>
          <span>0</span>
          <span>+1.0</span>
        </div>

        <ul className="mt-4 space-y-2.5 border-t pt-4">
          {factor.signals.map((s) => {
            const st = toneOf(s.trend_score);
            return (
              <li key={s.source_name} className="group/item">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground/80">{s.source_name}</span>
                  <span className={cn("font-mono tabular", toneText[st])}>{signed(s.trend_score, 2)}</span>
                </div>
                <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground transition-all group-hover/item:line-clamp-none">
                  {s.description}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </SpotlightCard>
  );
}

function PulseSkeleton() {
  return (
    <div className="rounded-xl border bg-card/60 p-5">
      <div className="skeleton h-8 w-32" />
      <div className="skeleton mt-6 h-10 w-24" />
      <div className="skeleton mt-4 h-1.5 w-full" />
      <div className="mt-6 space-y-3">
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-4/5" />
      </div>
    </div>
  );
}

export function WorldPulseGrid({ data }: { data: FactorsResponse | null }) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight">World Pulse</h2>
          <p className="text-sm text-muted-foreground">全球五大維度即時得分 · 超過 ±{data?.extreme_threshold ?? 0.8} 觸發警示</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {data
          ? data.factors.map((f, i) => <PulseCard key={f.category} factor={f} index={i} />)
          : Array.from({ length: 5 }, (_, i) => <PulseSkeleton key={i} />)}
      </div>
    </section>
  );
}
