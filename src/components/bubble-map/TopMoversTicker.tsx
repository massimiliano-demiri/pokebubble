"use client";

import { useMemo } from "react";
import { Flame, TrendingUp, TrendingDown } from "lucide-react";
import type { BubbleDatum } from "@/types/card";

interface TopMoversTickerProps {
  bubbles: BubbleDatum[];
  onSelect: (id: string) => void;
}

/** Ticker orizzontale stile "trading" con le carte più calde: aiuta a capire subito chi sta salendo/scendendo. */
export function TopMoversTicker({ bubbles, onSelect }: TopMoversTickerProps) {
  const movers = useMemo(() => {
    const sorted = [...bubbles].filter((b) => Number.isFinite(b.change)).sort((a, b) => b.change - a.change);
    const gainers = sorted.slice(0, 6);
    const losers = sorted.slice(-6).reverse();
    return { gainers, losers };
  }, [bubbles]);

  if (bubbles.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <span className="mr-1 flex shrink-0 items-center gap-1 text-xs font-bold uppercase tracking-wide text-orange-400">
        <Flame className="h-3.5 w-3.5" strokeWidth={2.5} /> Top mover
      </span>
      {movers.gainers.map((bubble) => (
        <MoverChip key={bubble.id} bubble={bubble} onSelect={onSelect} />
      ))}
      <span className="mx-1 shrink-0 text-zinc-700">|</span>
      {movers.losers.map((bubble) => (
        <MoverChip key={bubble.id} bubble={bubble} onSelect={onSelect} />
      ))}
    </div>
  );
}

function MoverChip({ bubble, onSelect }: { bubble: BubbleDatum; onSelect: (id: string) => void }) {
  const positive = bubble.change >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <button
      type="button"
      onClick={() => onSelect(bubble.id)}
      className={`flex shrink-0 items-center gap-1 rounded-full border-2 px-2.5 py-1 text-xs font-bold transition-transform hover:-translate-y-0.5 ${
        positive
          ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
          : "border-red-500 bg-red-500/10 text-red-300"
      }`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={3} /> {bubble.name} {positive ? "+" : ""}
      {bubble.change.toFixed(1)}%
    </button>
  );
}
