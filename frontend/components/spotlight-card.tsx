"use client";

import { useCallback, type CSSProperties, type MouseEvent } from "react";

import { Card } from "@/components/ui/card";
import { cn, type Tone } from "@/lib/utils";

const glowVar: Record<Tone, string> = {
  bull: "var(--bull)",
  bear: "var(--bear)",
  neutral: "var(--foreground)",
};

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
}

/** Hover 時跟隨滑鼠的微光漸層 + 邊框發光 + 輕微上浮。 */
export function SpotlightCard({ tone = "neutral", className, style, children, ...props }: SpotlightCardProps) {
  const onMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--x", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--y", `${e.clientY - rect.top}px`);
  }, []);

  return (
    <Card
      onMouseMove={onMove}
      style={{ "--glow": glowVar[tone], ...style } as CSSProperties}
      className={cn(
        "spotlight group bg-card/60 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/20",
        className,
      )}
      {...props}
    >
      {children}
    </Card>
  );
}
