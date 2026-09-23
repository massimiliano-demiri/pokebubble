import type { BubbleDatum, Timeframe } from "@/types/card";

const CARD_NAMES = [
  "Charizard", "Pikachu", "Blastoise", "Venusaur", "Mewtwo", "Mew", "Lugia", "Ho-Oh",
  "Rayquaza", "Gyarados", "Umbreon", "Espeon", "Sylveon", "Lucario", "Garchomp", "Dragonite",
  "Tyranitar", "Metagross", "Salamence", "Gengar", "Alakazam", "Machamp", "Snorlax", "Eevee",
  "Greninja", "Zoroark", "Sceptile", "Blaziken", "Swampert", "Absol", "Gardevoir", "Milotic",
  "Kingdra", "Aerodactyl", "Celebi", "Jirachi", "Deoxys", "Darkrai", "Arceus", "Giratina",
  "Palkia", "Dialga", "Zekrom", "Reshiram", "Kyurem", "Xerneas", "Yveltal", "Zygarde",
  "Solgaleo", "Lunala", "Necrozma", "Zacian", "Zamazenta", "Eternatus", "Urshifu", "Regieleki",
  "Calyrex", "Glaceon", "Leafeon", "Flareon", "Vaporeon", "Jolteon", "Mimikyu", "Toxtricity",
];

const SETS = [
  { name: "Base Set", weight: 3.2 },
  { name: "Jungle", weight: 1.6 },
  { name: "Fossil", weight: 1.7 },
  { name: "Team Rocket", weight: 1.4 },
  { name: "Neo Genesis", weight: 1.8 },
  { name: "Evolving Skies", weight: 2.4 },
  { name: "Crown Zenith", weight: 1.5 },
  { name: "Obsidian Flames", weight: 1.1 },
  { name: "Paldea Evolved", weight: 1.0 },
  { name: "151", weight: 2.1 },
];

// Deterministic PRNG so timeframe toggles produce stable, reproducible demo data.
export function mulberry32(seed: number) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const TIMEFRAME_SEED: Record<Timeframe, number> = { "24h": 0, "7d": 1, "30d": 2, "90d": 3, "1y": 4 };
export const TIMEFRAME_VOLATILITY: Record<Timeframe, number> = {
  "24h": 4,
  "7d": 8,
  "30d": 18,
  "90d": 32,
  "1y": 60,
};

/** Dataset demo usato quando Supabase non è configurato (sviluppo locale / preview). */
export function generateMockBubbles(timeframe: Timeframe): BubbleDatum[] {
  const random = mulberry32(1000 + TIMEFRAME_SEED[timeframe]);
  const volatility = TIMEFRAME_VOLATILITY[timeframe];
  const bubbles: BubbleDatum[] = [];

  for (const set of SETS) {
    for (const name of CARD_NAMES) {
      if (random() < 0.4) continue; // evita una griglia perfettamente uniforme

      const basePrice = 2 + random() * 400 * set.weight;
      const volume = 5 + Math.floor(random() * 200);
      const marketCap = basePrice * volume;
      const change = (random() - 0.5) * volatility * 2;

      bubbles.push({
        id: `${set.name}-${name}`.toLowerCase().replace(/\s+/g, "-"),
        name,
        setName: set.name,
        imageUrl: null,
        tcgplayerUrl: null,
        price: Math.round(basePrice * 100) / 100,
        marketCap: Math.round(marketCap),
        change: Math.round(change * 100) / 100,
      });
    }
  }

  return bubbles;
}
