import { TrendingUp } from "lucide-react";

/**
 * Logo originale (non riproduce il marchio Pokémon): una sfera/bolla di mercato con un trend
 * in salita, in stile "retro arcade" — coerente con il concept dell'app (bubble map di mercato).
 */
export function Logo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <svg viewBox="0 0 48 48" className="h-9 w-9 shrink-0 drop-shadow-[2px_2px_0_rgba(0,0,0,0.9)]">
        <defs>
          <radialGradient id="orb" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="45%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#dc2626" />
          </radialGradient>
        </defs>
        <circle cx="24" cy="24" r="21" fill="url(#orb)" stroke="#18181b" strokeWidth="2.5" />
        <ellipse cx="17" cy="16" rx="6" ry="4" fill="rgba(255,255,255,0.55)" />
        <path
          d="M13 28 L20 21 L25 26 L35 15"
          stroke="#18181b"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path d="M28 15 L35 15 L35 22" stroke="#18181b" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      <div className="flex items-baseline gap-1.5">
        <span
          className="font-logo text-2xl leading-none tracking-wide text-yellow-400 [-webkit-text-stroke:1.5px_#18181b]"
          style={{ textShadow: "2px 2px 0 #18181b" }}
        >
          PokéBubble
        </span>
        <span className="hidden items-center gap-1 rounded-full border-2 border-zinc-900 bg-emerald-400 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none text-zinc-900 sm:inline-flex">
          <TrendingUp className="h-3 w-3" strokeWidth={3} />
          live
        </span>
      </div>
    </div>
  );
}
