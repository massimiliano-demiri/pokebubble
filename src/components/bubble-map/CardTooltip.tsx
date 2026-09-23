"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, ShoppingCart, Search, TrendingUp, TrendingDown } from "lucide-react";
import type { BubbleDatum } from "@/types/card";
import { buildEbaySearchUrl, withAffiliateTag } from "@/lib/affiliate";
import { useDeviceTilt } from "@/lib/use-device-tilt";

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
  const tilt = useDeviceTilt();
  const positive = bubble.change >= 0;
  const ChangeIcon = positive ? TrendingUp : TrendingDown;
  const affiliateUrl = withAffiliateTag(bubble.tcgplayerUrl);
  const ebayUrl = buildEbaySearchUrl(bubble.name, bubble.setName);

  const content = (
    <>
      <div className="flex items-start gap-3">
        {bubble.imageUrl ? (
          <div className="relative shrink-0 overflow-hidden rounded-md border border-zinc-700 shadow-lg">
            <Image src={bubble.imageUrl} alt={bubble.name} width={56} height={78} unoptimized />
            {tilt ? (
              <div
                className="pointer-events-none absolute inset-0 mix-blend-color-dodge"
                style={{
                  opacity: 0.55,
                  background: `linear-gradient(${115 + tilt.gamma * 3}deg, transparent 30%, rgba(255,80,180,0.6) 40%, rgba(80,200,255,0.6) 48%, rgba(255,240,80,0.6) 56%, transparent 66%)`,
                  backgroundPosition: `${50 + tilt.gamma * 4}% ${50 + tilt.beta * 4}%`,
                }}
              />
            ) : null}
          </div>
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
            <ChangeIcon className="h-3.5 w-3.5" strokeWidth={3} /> {positive ? "+" : ""}
            {bubble.change.toFixed(2)}%
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi"
          className="pointer-events-auto -mt-1 -mr-1 rounded-full p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <X className="h-4 w-4" strokeWidth={2.5} />
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
            className="pointer-events-auto flex flex-1 items-center justify-center gap-1.5 rounded-md border-2 border-zinc-900 bg-emerald-400 px-3 py-2 text-center text-sm font-bold text-zinc-950 shadow-[2px_2px_0_#000] transition-transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
          >
            <ShoppingCart className="h-4 w-4" strokeWidth={2.5} /> Compra ora
          </a>
        ) : null}
        <a
          href={ebayUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="pointer-events-auto flex flex-1 items-center justify-center gap-1.5 rounded-md border-2 border-zinc-700 px-3 py-2 text-center text-sm font-bold text-zinc-200 transition-colors hover:bg-zinc-800"
        >
          <Search className="h-4 w-4" strokeWidth={2.5} /> Cerca su eBay
        </a>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-20 animate-[slide-up_0.2s_ease-out] rounded-t-2xl border-t-2 border-zinc-700 bg-zinc-900/98 p-4 pb-6 shadow-2xl backdrop-blur">
        {content}
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none absolute z-10 w-72 -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-lg border-2 border-zinc-700 bg-zinc-900/95 p-3 shadow-[4px_4px_0_#000] backdrop-blur"
      style={{ left: x, top: y }}
    >
      {content}
    </div>
  );
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
