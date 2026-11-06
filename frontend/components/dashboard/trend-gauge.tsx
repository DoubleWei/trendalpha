"use client";

import { useAnimatedNumber } from "@/hooks/use-animated-number";
import { cn, signed, toneOf, toneText } from "@/lib/utils";
import type { GlobalScoreResponse } from "@/types/market";

// 幾何設定：240° 弧形儀表，-100 → -120°，+100 → +120°
const SIZE = 420;
const CX = SIZE / 2;
const CY = 220;
const R = 170;
const SWEEP = 120;

const angleOf = (score: number) => (Math.max(-100, Math.min(100, score)) / 100) * SWEEP;

function polar(angleDeg: number, r = R) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: CX + r * Math.sin(a), y: CY - r * Math.cos(a) };
}

function arcPath(from: number, to: number, r = R) {
  const start = polar(from, r);
  const end = polar(to, r);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}

const TICKS = Array.from({ length: 41 }, (_, i) => -100 + i * 5);
const LABELS = [-100, -50, 0, 50, 100];

interface TrendGaugeProps {
  data: GlobalScoreResponse | null;
}

export function TrendGauge({ data }: TrendGaugeProps) {
  const target = data?.score ?? 0;
  const score = useAnimatedNumber(target);
  const tone = toneOf(score, 5);
  const angle = angleOf(score);
  const tip = polar(angle);
  const color = tone === "bull" ? "var(--bull)" : tone === "bear" ? "var(--bear)" : "var(--neutral)";

  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      {/* 背後的色彩光暈，跟隨多空變色 */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[38%] h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-colors duration-1000"
        style={{ background: `hsl(${color} / .22)` }}
      />

      <svg viewBox={`0 0 ${SIZE} 330`} className="relative w-full overflow-visible" role="img" aria-label={`台股全球預測總分 ${target.toFixed(0)}`}>
        <defs>
          <linearGradient id="gauge-track" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="hsl(var(--bear))" stopOpacity=".55" />
            <stop offset="50%" stopColor="hsl(var(--neutral))" stopOpacity=".25" />
            <stop offset="100%" stopColor="hsl(var(--bull))" stopOpacity=".55" />
          </linearGradient>
          <filter id="gauge-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 外圈刻度 */}
        {TICKS.map((v) => {
          const major = v % 50 === 0;
          const a = angleOf(v);
          const p1 = polar(a, R + 16);
          const p2 = polar(a, R + (major ? 28 : 21));
          const passed = (score >= 0 && v > 0 && v <= score) || (score < 0 && v < 0 && v >= score);
          return (
            <line
              key={v}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              strokeWidth={major ? 2 : 1}
              strokeLinecap="round"
              className="transition-[stroke] duration-300"
              style={{ stroke: passed ? `hsl(${color})` : "hsl(var(--foreground) / .18)" }}
            />
          );
        })}
        {LABELS.map((v) => {
          const p = polar(angleOf(v), R + 44);
          return (
            <text key={v} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground font-mono text-[11px] tabular">
              {signed(v)}
            </text>
          );
        })}

        {/* 底軌 */}
        <path d={arcPath(-SWEEP, SWEEP)} fill="none" stroke="hsl(var(--muted))" strokeWidth={16} strokeLinecap="round" />
        <path d={arcPath(-SWEEP, SWEEP)} fill="none" stroke="url(#gauge-track)" strokeWidth={2} strokeLinecap="round" />

        {/* 數值弧：由 0 出發往多 / 空延伸 */}
        {Math.abs(angle) > 0.5 && (
          <path
            d={angle >= 0 ? arcPath(0, angle) : arcPath(angle, 0)}
            fill="none"
            stroke={`hsl(${color})`}
            strokeWidth={16}
            strokeLinecap="round"
            filter="url(#gauge-glow)"
          />
        )}

        {/* 中央零點 */}
        <line x1={CX} y1={CY - R - 10} x2={CX} y2={CY - R + 10} stroke="hsl(var(--foreground) / .5)" strokeWidth={2} />

        {/* 指針端點 */}
        <circle cx={tip.x} cy={tip.y} r={14} fill={`hsl(${color} / .2)`} className="animate-pulse" />
        <circle cx={tip.x} cy={tip.y} r={7} fill="hsl(var(--background))" stroke={`hsl(${color})`} strokeWidth={3} />

        {/* 內圈裝飾 */}
        <circle cx={CX} cy={CY} r={R - 34} fill="none" stroke="hsl(var(--foreground) / .06)" strokeDasharray="2 6" />
      </svg>

      {/* 中央讀數 */}
      <div className="absolute inset-x-0 top-[30%] flex flex-col items-center text-center">
        <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-muted-foreground">Global Trend Score</span>
        <span
          className={cn("mt-1 font-mono text-7xl font-semibold tracking-tighter tabular transition-colors duration-500 sm:text-8xl", toneText[tone])}
          style={{ textShadow: `0 0 40px hsl(${color} / .45)` }}
        >
          {data ? signed(score) : "—"}
        </span>
        <span className={cn("mt-1 text-lg font-medium", toneText[tone])}>{data?.regime_label ?? "載入中"}</span>
        {data && (
          <span className="mt-2 text-xs text-muted-foreground">
            共識度 <span className="font-mono text-foreground tabular">{(data.confidence * 100).toFixed(0)}%</span>
            <span className="mx-2 opacity-40">·</span>
            {data.signal_count} 個全球訊號
          </span>
        )}
      </div>

      {/* 兩端標籤 */}
      <div className="mt-3 flex justify-between px-[6%] text-[11px] font-medium uppercase tracking-widest">
        <span className="text-bear">極度看空</span>
        <span className="text-bull">極度看多</span>
      </div>
    </div>
  );
}
