import { ArrowUpRight } from "lucide-react";
import { sponsorSlot } from "@/lib/affiliate";

/** Banner sponsor opzionale — invisibile finché NEXT_PUBLIC_SPONSOR_* non è configurato. */
export function SponsorBanner() {
  if (!sponsorSlot.enabled) return null;

  return (
    <a
      href={sponsorSlot.url}
      target="_blank"
      rel="sponsored noopener noreferrer"
      className="flex shrink-0 items-center gap-3 rounded-lg border-2 border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-transparent px-3 py-2 text-xs transition-transform hover:-translate-y-0.5"
    >
      <span className="rounded border-2 border-zinc-900 bg-amber-400 px-1.5 py-0.5 font-bold text-zinc-900">Sponsor</span>
      <span className="font-semibold text-amber-100">{sponsorSlot.name}</span>
      {sponsorSlot.tagline ? <span className="hidden text-zinc-400 sm:inline">{sponsorSlot.tagline}</span> : null}
      <span className="flex items-center gap-0.5 text-amber-300">
        Vai al sito <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    </a>
  );
}
