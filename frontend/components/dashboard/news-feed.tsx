"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Newspaper } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn, signed, timeAgo, toneOf } from "@/lib/utils";
import type { NewsDigest } from "@/types/market";

const PAGE = 10;
const TONE_LABEL = { bull: "利多", bear: "利空", neutral: "中性" } as const;

interface NewsFeedProps {
  data: NewsDigest | null;
  industry: string | null;
  onIndustryChange: (key: string | null) => void;
}

export function NewsFeed({ data, industry, onIndustryChange }: NewsFeedProps) {
  const [limit, setLimit] = useState(PAGE);
  const [tone, setTone] = useState<"all" | "bull" | "bear">("all");

  const articles = useMemo(() => {
    return (data?.articles ?? []).filter(
      (a) => (!industry || a.industry === industry) && (tone === "all" || toneOf(a.sentiment) === tone),
    );
  }, [data, industry, tone]);

  if (!data) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton h-14" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* 篩選列 */}
      <div className="flex flex-wrap items-center gap-1.5">
        {[{ key: null, label: "全部產業" }, ...data.industries.map((i) => ({ key: i.key, label: i.label }))].map((opt) => (
          <button
            key={opt.key ?? "all"}
            onClick={() => {
              onIndustryChange(opt.key);
              setLimit(PAGE);
            }}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs transition-colors",
              industry === opt.key ? "border-foreground/40 bg-foreground text-background" : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        ))}
        <div className="ml-auto flex rounded-md border bg-muted/40 p-0.5">
          {(["all", "bull", "bear"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTone(t)}
              className={cn(
                "rounded px-2 py-0.5 text-[11px] transition-colors",
                tone === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "all" ? "全部" : TONE_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      {/* 列表 */}
      <ul className="mt-3 divide-y rounded-xl border bg-card/50 backdrop-blur-sm">
        {articles.length === 0 && (
          <li className="px-4 py-10 text-center text-sm text-muted-foreground">這個篩選條件下沒有新聞</li>
        )}
        {articles.slice(0, limit).map((a) => {
          const t = toneOf(a.sentiment);
          const Title = a.url ? "a" : "span";
          return (
            <li key={`${a.title}-${a.published_at}`} className="group relative flex gap-3 px-4 py-3 transition-colors hover:bg-accent/40">
              <span
                className={cn(
                  "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                  t === "bull" && "bg-bull shadow-[0_0_8px_hsl(var(--bull)/.8)]",
                  t === "bear" && "bg-bear shadow-[0_0_8px_hsl(var(--bear)/.8)]",
                  t === "neutral" && "bg-neutral/60",
                )}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <Title
                  {...(a.url ? { href: a.url, target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="line-clamp-2 text-sm leading-6 text-foreground/90 decoration-foreground/30 underline-offset-4 group-hover:text-foreground [a&]:hover:underline"
                >
                  {a.title}
                  {a.url && <ExternalLink className="ml-1 inline h-3 w-3 align-[-1px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />}
                </Title>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                  <span>{a.source}</span>
                  <span className="opacity-40">·</span>
                  <span>{a.industry_label}</span>
                  <span className="opacity-40">·</span>
                  <span className="font-mono">{a.symbols.join(" ")}</span>
                  <span className="opacity-40">·</span>
                  <span>{timeAgo(a.published_at)}</span>
                  {a.matched.length > 0 && (
                    <span className="hidden truncate opacity-70 sm:inline">判讀：{a.matched.slice(0, 3).join("、")}</span>
                  )}
                </div>
              </div>
              <Badge tone={t} className="h-fit shrink-0">
                {TONE_LABEL[t]} <span className="font-mono">{signed(a.sentiment, 2)}</span>
              </Badge>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Newspaper className="h-3.5 w-3.5" />
          來源：
          {Object.entries(data.providers)
            .map(([k, v]) => `${k === "finmind" ? "FinMind" : k === "yfinance" ? "yfinance" : k} ${v} 則`)
            .join("・")}
        </span>
        {articles.length > limit && (
          <button onClick={() => setLimit((l) => l + PAGE)} className="rounded-md border px-3 py-1 transition-colors hover:bg-accent hover:text-foreground">
            顯示更多（剩 {articles.length - limit}）
          </button>
        )}
      </div>
    </div>
  );
}
