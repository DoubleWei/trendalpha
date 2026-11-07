"use client";

import { cn, signed, toneOf, toneText } from "@/lib/utils";
import type { QuotesResponse } from "@/types/market";

function formatPrice(v: number) {
  if (v >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (v >= 100) return v.toFixed(1);
  return v.toFixed(2);
}

/** 行情跑馬燈：滑鼠移入暫停；兩份清單首尾相接做無縫循環。 */
export function TickerTape({ data }: { data: QuotesResponse | null }) {
  if (!data || data.quotes.length === 0) {
    return <div className="skeleton h-10 w-full rounded-lg" />;
  }
  const items = [...data.quotes, ...data.quotes];

  return (
    <div
      className="group relative overflow-hidden rounded-lg border bg-card/50 backdrop-blur-sm [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]"
      aria-label="主要市場行情"
    >
      <div className="flex w-max animate-marquee gap-0 py-2.5 group-hover:[animation-play-state:paused]">
        {items.map((q, i) => {
          const tone = toneOf(q.change_pct, 0.005);
          return (
            <div
              key={`${q.symbol}-${i}`}
              aria-hidden={i >= data.quotes.length}
              className="flex shrink-0 items-center gap-2 border-r border-border/60 px-5 text-[13px]"
            >
              <span className="text-muted-foreground">{q.name}</span>
              <span className="font-mono tabular text-foreground">{formatPrice(q.last)}</span>
              <span className={cn("font-mono text-xs tabular", toneText[tone])}>
                {tone === "bull" ? "▲" : tone === "bear" ? "▼" : "•"} {signed(q.change_pct, 2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
