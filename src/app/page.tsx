"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Share2, Check, TrendingUp, TrendingDown } from "lucide-react";
import { BubbleMap } from "@/components/bubble-map/BubbleMap";
import { TimeframeToggle } from "@/components/bubble-map/TimeframeToggle";
import { TopMoversTicker } from "@/components/bubble-map/TopMoversTicker";
import { SponsorBanner } from "@/components/SponsorBanner";
import { Logo } from "@/components/Logo";
import type { BubbleDatum, CardsApiResponse, Timeframe } from "@/types/card";

export default function Home() {
  const [timeframe, setTimeframe] = useState<Timeframe>("24h");
  const [bubbles, setBubbles] = useState<BubbleDatum[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<CardsApiResponse["source"] | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/cards?timeframe=${timeframe}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data: CardsApiResponse) => {
        setBubbles(data.bubbles);
        setSource(data.source);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error(error);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [timeframe]);

  const filteredBubbles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bubbles;
    return bubbles.filter(
      (b) => b.name.toLowerCase().includes(q) || b.setName.toLowerCase().includes(q)
    );
  }, [bubbles, query]);

  async function handleShare() {
    const shareData = { title: "PokéBubble", text: "Guarda il mercato Pokémon TCG in tempo reale", url: window.location.href };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(shareData.url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      // user cancelled the share sheet — nothing to do
    }
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-50">
      <header className="flex flex-col gap-3 border-b-2 border-zinc-800 bg-zinc-950 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Logo />
            <p className="mt-1 text-sm text-zinc-400">Mercato Pokémon TCG in tempo reale</p>
          </div>
          <div className="flex items-center gap-2">
            <SponsorBanner />
            <button
              type="button"
              onClick={handleShare}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border-2 border-zinc-900 bg-zinc-100 px-3 py-1.5 text-sm font-bold text-zinc-900 shadow-[3px_3px_0_#000] transition-transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
            >
              {shared ? <Check className="h-4 w-4" strokeWidth={3} /> : <Share2 className="h-4 w-4" strokeWidth={2.5} />}
              {shared ? "Copiato!" : "Condividi"}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TimeframeToggle value={timeframe} onChange={setTimeframe} />
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca carta o set…"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 py-1.5 pl-8 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <TrendingUp className="h-3.5 w-3.5" strokeWidth={3} /> In crescita
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <TrendingDown className="h-3.5 w-3.5" strokeWidth={3} /> In calo
            </span>
          </div>
        </div>
      </header>
      {!loading && bubbles.length > 0 ? (
        <div className="border-b border-zinc-800">
          <TopMoversTicker bubbles={bubbles} onSelect={setSelectedId} />
        </div>
      ) : null}
      <main className="relative flex-1">
        {loading ? (
          <div className="flex h-full items-center justify-center text-zinc-500">
            Caricamento bolle di mercato…
          </div>
        ) : (
          <BubbleMap bubbles={filteredBubbles} selectedId={selectedId} onSelect={setSelectedId} />
        )}
        {source && source !== "supabase" ? (
          <div className="absolute bottom-4 left-4 rounded-md bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-400">
            Dati demo — configura Supabase per i dati reali
          </div>
        ) : null}
      </main>
    </div>
  );
}
