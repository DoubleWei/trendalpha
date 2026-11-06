"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Activity, Search } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SymbolItem {
  symbol: string;
  name: string;
  market: "TW" | "US" | "IDX";
}

// TODO: 接後端 /api/v1/symbols/search 取代靜態清單
const SYMBOLS: SymbolItem[] = [
  { symbol: "^TWII", name: "台灣加權指數", market: "IDX" },
  { symbol: "TXF", name: "台指期近月", market: "IDX" },
  { symbol: "2330.TW", name: "台積電", market: "TW" },
  { symbol: "2317.TW", name: "鴻海", market: "TW" },
  { symbol: "2454.TW", name: "聯發科", market: "TW" },
  { symbol: "2308.TW", name: "台達電", market: "TW" },
  { symbol: "TSM", name: "Taiwan Semiconductor ADR", market: "US" },
  { symbol: "NVDA", name: "NVIDIA", market: "US" },
  { symbol: "AAPL", name: "Apple", market: "US" },
  { symbol: "^SOX", name: "費城半導體指數", market: "IDX" },
  { symbol: "^IXIC", name: "那斯達克綜合指數", market: "IDX" },
];

function SymbolSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SYMBOLS.slice(0, 6);
    return SYMBOLS.filter((s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query]);

  // ⌘K / Ctrl+K / "/" 快速聚焦
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.tagName === "INPUT";
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const select = (item: SymbolItem) => {
    setQuery(item.symbol);
    setOpen(false);
    inputRef.current?.blur();
    // TODO: router.push(`/symbol/${encodeURIComponent(item.symbol)}`)
  };

  return (
    <div className="relative w-full max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") setActive((i) => Math.min(i + 1, results.length - 1));
          else if (e.key === "ArrowUp") setActive((i) => Math.max(i - 1, 0));
          else if (e.key === "Enter" && results[active]) select(results[active]);
          else if (e.key === "Escape") inputRef.current?.blur();
          else return;
          e.preventDefault();
        }}
        placeholder="搜尋台美股商品…"
        aria-label="搜尋台美股商品"
        className="h-8 bg-muted/40 pl-8 pr-12 text-[13px] transition-[background-color,box-shadow] focus-visible:bg-background focus-visible:shadow-[0_0_0_4px_hsl(var(--foreground)/.04)]"
      />
      <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border bg-background px-1.5 font-mono text-[10px] text-muted-foreground sm:block">
        ⌘K
      </kbd>

      {open && results.length > 0 && (
        <div className="absolute inset-x-0 top-10 z-50 animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 overflow-hidden rounded-lg border bg-popover/95 p-1 shadow-2xl backdrop-blur-xl">
          {results.map((item, i) => (
            <button
              key={item.symbol}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => select(item)}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-[13px] transition-colors",
                i === active ? "bg-accent" : "hover:bg-accent/60",
              )}
            >
              <span className="flex items-center gap-2.5">
                <span className="font-mono font-medium">{item.symbol}</span>
                <span className="text-muted-foreground">{item.name}</span>
              </span>
              <span className="rounded border px-1.5 py-px font-mono text-[10px] text-muted-foreground">{item.market}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/50">
      <div className="container flex h-14 items-center gap-4">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5">
          <span className="relative grid h-7 w-7 place-items-center rounded-lg border bg-gradient-to-br from-bull/25 via-transparent to-violet-500/25 transition-shadow duration-300 group-hover:shadow-[0_0_18px_hsl(var(--bull)/.45)]">
            <Activity className="h-3.5 w-3.5 text-bull" strokeWidth={2.5} />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">
            Trend<span className="text-bull">Alpha</span>
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 text-[13px] text-muted-foreground md:flex">
          {["總覽", "因子", "回測", "外掛"].map((item, i) => (
            <a
              key={item}
              href="#"
              className={cn(
                "rounded-md px-2.5 py-1.5 transition-colors hover:bg-accent hover:text-foreground",
                i === 0 && "text-foreground",
              )}
            >
              {item}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex flex-1 items-center justify-end gap-2">
          <SymbolSearch />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
