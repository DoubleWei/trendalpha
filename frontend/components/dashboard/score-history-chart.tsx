"use client";

import { useMemo, useState } from "react";
import { LineChart } from "lucide-react";

import { Card } from "@/components/ui/card";
import { useElementWidth } from "@/hooks/use-element-width";
import { cn, signed, toneOf, toneText } from "@/lib/utils";
import type { HistoryPoint, HistoryResponse } from "@/types/market";

const RANGES = [
  { key: "1d", label: "24H", ms: 864e5 },
  { key: "3d", label: "3D", ms: 3 * 864e5 },
  { key: "7d", label: "7D", ms: 7 * 864e5 },
  { key: "all", label: "全部", ms: Infinity },
] as const;

const H = 190;
const PAD = { top: 12, right: 12, bottom: 22, left: 34 };

function fmtTime(t: number, withDate: boolean) {
  const d = new Date(t);
  const hm = d.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false });
  return withDate ? `${d.getMonth() + 1}/${d.getDate()} ${hm}` : hm;
}

export function ScoreHistoryChart({ data }: { data: HistoryResponse | null }) {
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("3d");
  const [hover, setHover] = useState<number | null>(null);
  const [ref, width] = useElementWidth<HTMLDivElement>();

  const points = useMemo(() => {
    const all = (data?.points ?? []).map((p) => ({ ...p, ts: new Date(p.t).getTime() }));
    const ms = RANGES.find((r) => r.key === range)!.ms;
    const latest = all.at(-1)?.ts ?? Date.now();
    return all.filter((p) => latest - p.ts <= ms);
  }, [data, range]);

  const geo = useMemo(() => {
    if (points.length < 2) return null;
    const x0 = points[0].ts;
    const x1 = points.at(-1)!.ts;
    const peak = Math.max(30, ...points.map((p) => Math.abs(p.score)));
    const yMax = Math.min(100, Math.ceil(peak / 10) * 10);
    const iw = width - PAD.left - PAD.right;
    const ih = H - PAD.top - PAD.bottom;
    const x = (ts: number) => PAD.left + ((ts - x0) / (x1 - x0 || 1)) * iw;
    const y = (v: number) => PAD.top + ((yMax - v) / (2 * yMax)) * ih;
    const line = points.map((p, i) => `${i ? "L" : "M"}${x(p.ts).toFixed(1)},${y(p.score).toFixed(1)}`).join("");
    const area = `${line}L${x(x1)},${y(0)}L${x(x0)},${y(0)}Z`;
    const multiDay = x1 - x0 > 864e5;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => x0 + (x1 - x0) * f);
    return { x, y, yMax, line, area, ticks, multiDay, iw };
  }, [points, width]);

  const active: (HistoryPoint & { ts: number }) | null = hover != null ? points[hover] : null;
  const first = points[0]?.score;
  const last = points.at(-1)?.score;
  const delta = first != null && last != null ? last - first : null;

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    if (!geo) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left + PAD.left;
    let best = 0;
    let bestDist = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(geo.x(p.ts) - mx);
      if (d < bestDist) [best, bestDist] = [i, d];
    });
    setHover(best);
  };

  return (
    <Card className="bg-card/60 p-5 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <LineChart className="h-4 w-4 text-muted-foreground" />
            總分走勢
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {delta != null && points.length > 1 ? (
              <>
                區間變化{" "}
                <span className={cn("font-mono tabular", toneText[toneOf(delta, 0.5)])}>{signed(delta, 1)}</span> 分
              </>
            ) : (
              "每次計算新增一點"
            )}
          </p>
        </div>
        <div className="flex rounded-md border bg-muted/40 p-0.5" role="tablist" aria-label="時間範圍">
          {RANGES.map((r) => (
            <button
              key={r.key}
              role="tab"
              aria-selected={range === r.key}
              onClick={() => setRange(r.key)}
              className={cn(
                "rounded px-2 py-1 font-mono text-[11px] transition-colors",
                range === r.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={ref} className="relative mt-4">
        {!geo ? (
          <div className="grid h-[190px] place-items-center rounded-md border border-dashed text-xs text-muted-foreground">
            歷史資料累積中（目前 {points.length} 筆），每 30 分鐘新增一點
          </div>
        ) : (
          <svg width={width} height={H} className="block overflow-visible" role="img" aria-label="台股全球預測總分歷史走勢">
            <defs>
              <linearGradient id="hist-bull" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--bull))" stopOpacity=".35" />
                <stop offset="100%" stopColor="hsl(var(--bull))" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="hist-bear" x1="0" x2="0" y1="1" y2="0">
                <stop offset="0%" stopColor="hsl(var(--bear))" stopOpacity=".35" />
                <stop offset="100%" stopColor="hsl(var(--bear))" stopOpacity="0" />
              </linearGradient>
              <clipPath id="clip-above">
                <rect x={0} y={0} width={width} height={geo.y(0)} />
              </clipPath>
              <clipPath id="clip-below">
                <rect x={0} y={geo.y(0)} width={width} height={H} />
              </clipPath>
            </defs>

            {/* 格線與 Y 軸 */}
            {[geo.yMax, geo.yMax / 2, 0, -geo.yMax / 2, -geo.yMax].map((v) => (
              <g key={v}>
                <line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={geo.y(v)}
                  y2={geo.y(v)}
                  stroke="hsl(var(--foreground))"
                  strokeOpacity={v === 0 ? 0.25 : 0.06}
                  strokeDasharray={v === 0 ? undefined : "2 4"}
                />
                <text x={PAD.left - 8} y={geo.y(v)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground font-mono text-[10px]">
                  {signed(v)}
                </text>
              </g>
            ))}
            {geo.ticks.map((t, i) => (
              <text
                key={t}
                x={geo.x(t)}
                y={H - 4}
                textAnchor={i === 0 ? "start" : i === geo.ticks.length - 1 ? "end" : "middle"}
                className="fill-muted-foreground font-mono text-[10px]"
              >
                {fmtTime(t, geo.multiDay)}
              </text>
            ))}

            {/* 多空分色面積 + 線 */}
            <path d={geo.area} fill="url(#hist-bull)" clipPath="url(#clip-above)" />
            <path d={geo.area} fill="url(#hist-bear)" clipPath="url(#clip-below)" />
            <path d={geo.line} fill="none" stroke="hsl(var(--bull))" strokeWidth={2} strokeLinejoin="round" clipPath="url(#clip-above)" />
            <path d={geo.line} fill="none" stroke="hsl(var(--bear))" strokeWidth={2} strokeLinejoin="round" clipPath="url(#clip-below)" />

            {/* 最新點 */}
            <circle cx={geo.x(points.at(-1)!.ts)} cy={geo.y(last!)} r={4} fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth={2} />

            {/* Hover crosshair */}
            {active && (
              <g pointerEvents="none">
                <line x1={geo.x(active.ts)} x2={geo.x(active.ts)} y1={PAD.top} y2={H - PAD.bottom} stroke="hsl(var(--foreground))" strokeOpacity={0.3} />
                <circle cx={geo.x(active.ts)} cy={geo.y(active.score)} r={5} fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth={2} />
              </g>
            )}
            <rect
              x={PAD.left}
              y={0}
              width={geo.iw}
              height={H}
              fill="transparent"
              onMouseMove={onMove}
              onMouseLeave={() => setHover(null)}
            />
          </svg>
        )}

        {geo && active && (
          <div
            className="pointer-events-none absolute top-0 z-10 rounded-md border bg-popover/95 px-2.5 py-1.5 text-xs shadow-xl backdrop-blur"
            style={{
              left: Math.min(Math.max(geo.x(active.ts) - 60, 0), width - 130),
            }}
          >
            <div className="text-muted-foreground">{fmtTime(active.ts, true)}</div>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="font-mono text-sm font-semibold tabular text-foreground">{signed(active.score, 1)}</span>
              <span className="text-muted-foreground">{active.regime_label}</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
