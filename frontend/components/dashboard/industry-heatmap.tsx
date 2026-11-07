"use client";

import { Flame } from "lucide-react";

import { cn, signed, toneOf, toneText } from "@/lib/utils";
import type { NewsDigest } from "@/types/market";

interface IndustryHeatmapProps {
  data: NewsDigest | null;
  selected: string | null;
  onSelect: (key: string | null) => void;
}

/** 產業新聞熱力圖：色彩深淺 = 情緒強度，點擊篩選右側新聞牆。 */
export function IndustryHeatmap({ data, selected, onSelect }: IndustryHeatmapProps) {
  if (!data) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {data.industries.map((ind) => {
        const tone = toneOf(ind.score);
        const intensity = 0.06 + Math.min(1, Math.abs(ind.score)) * 0.3;
        const color = tone === "bull" ? "var(--bull)" : tone === "bear" ? "var(--bear)" : "var(--neutral)";
        const total = Math.max(1, ind.bullish + ind.bearish);
        const isSel = selected === ind.key;
        return (
          <button
            key={ind.key}
            onClick={() => onSelect(isSel ? null : ind.key)}
            aria-pressed={isSel}
            className={cn(
              "group relative flex min-h-32 flex-col rounded-xl border p-3.5 text-left transition-all duration-300 hover:-translate-y-0.5",
              isSel ? "border-foreground/50 ring-1 ring-foreground/30" : "hover:border-foreground/25",
            )}
            style={{
              background: `linear-gradient(140deg, hsl(${color} / ${intensity}), hsl(${color} / ${intensity * 0.25}) 70%)`,
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-medium">{ind.label}</span>
              <span className={cn("font-mono text-lg font-semibold leading-none tabular", toneText[tone])}>
                {signed(ind.score, 2)}
              </span>
            </div>

            <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
              <Flame className="h-3 w-3" />
              {ind.article_count} 則
              <span className="text-bull">▲{ind.bullish}</span>
              <span className="text-bear">▼{ind.bearish}</span>
            </div>
            {/* 利多 / 利空比例條 */}
            <div className="mt-1.5 flex h-1 gap-0.5 overflow-hidden rounded-full bg-muted">
              <div className="rounded-full bg-bull" style={{ width: `${(ind.bullish / total) * 100}%` }} />
              <div className="rounded-full bg-bear" style={{ width: `${(ind.bearish / total) * 100}%` }} />
            </div>

            <p className="mt-2.5 line-clamp-2 text-[11px] leading-4 text-foreground/70">
              {ind.top_headline ?? "近期無相關新聞"}
            </p>
          </button>
        );
      })}
    </div>
  );
}
