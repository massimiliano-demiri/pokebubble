"use client";

import { useMemo } from "react";
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
      <span className="mr-1 shrink-0 text-xs font-semibold uppercase tracking-wide text-zinc-500">🔥 Top mover</span>
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
  return (
    <button
      type="button"
      onClick={() => onSelect(bubble.id)}
      className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold transition-transform hover:scale-105 ${
        positive
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
          : "border-red-500/40 bg-red-500/10 text-red-300"
      }`}
    >
      {positive ? "▲" : "▼"} {bubble.name} {positive ? "+" : ""}
      {bubble.change.toFixed(1)}%
    </button>
  );
}
