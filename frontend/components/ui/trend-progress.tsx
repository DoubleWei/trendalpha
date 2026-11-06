import { cn, toneOf } from "@/lib/utils";

interface TrendProgressProps {
  /** -1 ~ +1 */
  value: number;
  className?: string;
}

/**
 * 雙向進度條：中線為 0，向右螢光綠（多）、向左霓虹紅（空）。
 * 以 shadcn Progress 的視覺語言重新實作，因原版只支援單向。
 */
export function TrendProgress({ value, className }: TrendProgressProps) {
  const v = Math.max(-1, Math.min(1, value));
  const tone = toneOf(v);
  const width = `${Math.abs(v) * 50}%`;

  return (
    <div
      role="progressbar"
      aria-valuemin={-1}
      aria-valuemax={1}
      aria-valuenow={Number(v.toFixed(2))}
      className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div className="absolute inset-y-0 left-1/2 w-px bg-foreground/20" />
      <div
        className={cn(
          "absolute inset-y-0 rounded-full transition-[width,left,background-color] duration-700 ease-out",
          tone === "bull" && "bg-gradient-to-r from-bull/40 to-bull shadow-[0_0_12px_hsl(var(--bull)/.6)]",
          tone === "bear" && "bg-gradient-to-l from-bear/40 to-bear shadow-[0_0_12px_hsl(var(--bear)/.6)]",
          tone === "neutral" && "bg-neutral",
        )}
        style={{ width, left: v >= 0 ? "50%" : `calc(50% - ${width})` }}
      />
    </div>
  );
}
