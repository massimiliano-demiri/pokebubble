"use client";

import { cn } from "@/lib/utils";
import type { Timeframe } from "@/types/card";

const OPTIONS: { value: Timeframe; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7g" },
  { value: "30d", label: "30g" },
  { value: "90d", label: "90g" },
  { value: "1y", label: "1 anno" },
];

interface TimeframeToggleProps {
  value: Timeframe;
  onChange: (value: Timeframe) => void;
}

export function TimeframeToggle({ value, onChange }: TimeframeToggleProps) {
  return (
    <div
      className="inline-flex max-w-full gap-1 overflow-x-auto rounded-lg border-2 border-zinc-800 bg-zinc-900/60 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="group"
      aria-label="Timeframe"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "shrink-0 rounded-md px-3 py-1.5 text-sm font-bold transition-all",
            value === option.value
              ? "bg-yellow-400 text-zinc-900 shadow-[2px_2px_0_#000]"
              : "text-zinc-400 hover:text-zinc-100"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
