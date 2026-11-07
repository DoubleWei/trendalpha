"use client";

import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn, signed } from "@/lib/utils";
import type { FactorsResponse } from "@/types/market";

interface Row {
  name: string;
  group: string;
  description: string;
  contribution: number;
}

/**
 * 每個訊號對總分的貢獻點數（發散長條圖）。
 * 貢獻 = 維度貢獻 × 該訊號在維度內的加權分數占比，因此全部加總等於總分。
 */
export function SignalContribution({ data }: { data: FactorsResponse | null }) {
  const [expanded, setExpanded] = useState(false);
  const [hover, setHover] = useState<string | null>(null);

  const rows = useMemo<Row[]>(() => {
    if (!data) return [];
    const out: Row[] = [];
    for (const f of data.factors) {
      const total = f.signals.reduce((acc, s) => acc + s.weight, 0) || 1;
      // 維度內以原始權重分攤（維度分數 = Σ s·w / Σ w），再乘上維度的總分貢獻
      const scale = f.score !== 0 ? f.contribution / f.score : 0;
      for (const s of f.signals) {
        out.push({
          name: s.source_name,
          group: f.label,
          description: s.description,
          contribution: (s.trend_score * s.weight) / total * scale,
        });
      }
    }
    return out.sort((a, b) => b.contribution - a.contribution);
  }, [data]);

  const max = Math.max(1, ...rows.map((r) => Math.abs(r.contribution)));
  const visible = expanded ? rows : [...rows.slice(0, 5), ...rows.slice(-5)].filter((r, i, arr) => arr.indexOf(r) === i);

  return (
    <Card className="bg-card/60 p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          訊號貢獻拆解
        </div>
        <span className="text-xs text-muted-foreground">單位：總分點數</span>
      </div>

      {rows.length === 0 ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton h-5 w-full" />
          ))}
        </div>
      ) : (
        <ul className="mt-4 space-y-1">
          {visible.map((r, i) => {
            const pct = (Math.abs(r.contribution) / max) * 50;
            const pos = r.contribution >= 0;
            const showGap = !expanded && i === 5 && rows.length > 10;
            return (
              <li key={`${r.group}-${r.name}`}>
                {showGap && <div className="my-1.5 border-t border-dashed" />}
                <div
                  className="group relative grid cursor-default grid-cols-[minmax(0,7.5rem)_1fr_3.25rem] items-center gap-3 rounded-md px-1.5 py-1 transition-colors hover:bg-accent/60"
                  onMouseEnter={() => setHover(r.name)}
                  onMouseLeave={() => setHover(null)}
                >
                  <span className="truncate text-xs text-foreground/80" title={r.name}>
                    {r.name}
                  </span>
                  <div className="relative h-3">
                    <div className="absolute inset-y-[-3px] left-1/2 w-px bg-foreground/20" />
                    <div
                      className={cn(
                        "absolute inset-y-0 transition-all duration-700",
                        pos ? "rounded-r bg-bull/80" : "rounded-l bg-bear/80",
                        hover === r.name && (pos ? "bg-bull shadow-[0_0_10px_hsl(var(--bull)/.6)]" : "bg-bear shadow-[0_0_10px_hsl(var(--bear)/.6)]"),
                      )}
                      style={{ width: `${pct}%`, left: pos ? "50%" : `${50 - pct}%` }}
                    />
                  </div>
                  <span className="text-right font-mono text-xs tabular text-foreground">{signed(r.contribution, 1)}</span>

                  {hover === r.name && (
                    <div className="pointer-events-none absolute bottom-full left-0 z-20 mb-1 w-72 rounded-md border bg-popover/95 p-2.5 text-xs shadow-xl backdrop-blur">
                      <div className="text-muted-foreground">{r.group}</div>
                      <div className="mt-0.5 font-medium text-foreground">{r.name}</div>
                      <p className="mt-1 leading-5 text-muted-foreground">{r.description}</p>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {rows.length > 10 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 w-full rounded-md border py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {expanded ? "只看前後 5 名" : `展開全部 ${rows.length} 個訊號`}
        </button>
      )}
    </Card>
  );
}
