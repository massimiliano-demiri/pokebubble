"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { BubbleDatum } from "@/types/card";
import { buildEbaySearchUrl, withAffiliateTag } from "@/lib/affiliate";

interface CardTooltipProps {
  bubble: BubbleDatum;
  x: number;
  y: number;
  onClose: () => void;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);
  return isMobile;
}

export function CardTooltip({ bubble, x, y, onClose }: CardTooltipProps) {
  const isMobile = useIsMobile();
  const positive = bubble.change >= 0;
  const affiliateUrl = withAffiliateTag(bubble.tcgplayerUrl);
  const ebayUrl = buildEbaySearchUrl(bubble.name, bubble.setName);

  const content = (
    <>
      <div className="flex items-start gap-3">
        {bubble.imageUrl ? (
          <Image
            src={bubble.imageUrl}
            alt={bubble.name}
            width={56}
            height={78}
            className="rounded-md border border-zinc-700 shadow-lg"
            unoptimized
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-zinc-50">{bubble.name}</p>
          <p className="truncate text-xs text-zinc-400">
            {bubble.setName}
            {bubble.rarity ? ` · ${bubble.rarity}` : ""}
          </p>
          <span
            className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
              positive ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"
            }`}
          >
            {positive ? "▲" : "▼"} {positive ? "+" : ""}
            {bubble.change.toFixed(2)}%
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi"
          className="pointer-events-auto -mt-1 -mr-1 rounded-full p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
        >
          ✕
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-zinc-400">Market cap stimato</span>
        <span className="font-mono font-semibold text-zinc-50">${formatCompact(bubble.marketCap)}</span>
      </div>
      <div className="mt-3 flex gap-2">
        {affiliateUrl ? (
          <a
            href={affiliateUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="pointer-events-auto flex-1 rounded-md bg-emerald-500 px-3 py-2 text-center text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400"
          >
            🛒 Compra ora
          </a>
        ) : null}
        <a
          href={ebayUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="pointer-events-auto flex-1 rounded-md border border-zinc-700 px-3 py-2 text-center text-sm font-semibold text-zinc-200 transition-colors hover:bg-zinc-800"
        >
          🔎 Cerca su eBay
        </a>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-20 animate-[slide-up_0.2s_ease-out] rounded-t-2xl border-t border-zinc-700 bg-zinc-900/98 p-4 pb-6 shadow-2xl backdrop-blur">
        {content}
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none absolute z-10 w-72 -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-lg border border-zinc-700 bg-zinc-900/95 p-3 shadow-xl backdrop-blur"
      style={{ left: x, top: y }}
    >
      {content}
    </div>
  );
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
