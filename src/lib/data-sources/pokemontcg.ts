import type { BubbleDatum, Timeframe } from "@/types/card";
import { mulberry32, TIMEFRAME_SEED, TIMEFRAME_VOLATILITY } from "@/lib/mock-data";

const BASE_URL = "https://api.pokemontcg.io/v2";

export interface PokemonTcgCard {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  images: { small: string; large: string };
  set: { id: string; name: string; series: string };
  tcgplayer?: {
    url: string;
    prices?: Record<string, { low?: number; mid?: number; high?: number; market?: number }>;
  };
  cardmarket?: {
    url: string;
    prices?: { averageSellPrice?: number; lowPrice?: number; trendPrice?: number };
  };
}

interface PokemonTcgListResponse {
  data: PokemonTcgCard[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}

/** Livello 1 (gratuito): catalogo carte + prezzi TCGPlayer/Cardmarket da pokemontcg.io */
export async function fetchPokemonTcgCards(
  params: { page?: number; pageSize?: number; query?: string } = {}
): Promise<PokemonTcgCard[]> {
  const apiKey = process.env.POKEMONTCG_API_KEY;
  const url = new URL(`${BASE_URL}/cards`);
  url.searchParams.set("page", String(params.page ?? 1));
  url.searchParams.set("pageSize", String(params.pageSize ?? 250));
  if (params.query) url.searchParams.set("q", params.query);

  const res = await fetch(url.toString(), {
    headers: apiKey ? { "X-Api-Key": apiKey } : undefined,
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`pokemontcg.io request failed: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as PokemonTcgListResponse;
  return json.data;
}

/** Prezzo di mercato "migliore sforzo" da un record pokemontcg.io. */
export function extractMarketPrice(card: PokemonTcgCard): number | null {
  const tcgPrices = card.tcgplayer?.prices;
  if (tcgPrices) {
    for (const variant of Object.values(tcgPrices)) {
      if (typeof variant.market === "number") return variant.market;
    }
  }
  return card.cardmarket?.prices?.trendPrice ?? card.cardmarket?.prices?.averageSellPrice ?? null;
}

function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Converte carte reali di pokemontcg.io in bubble con immagine autentica.
 * Prezzo/volume/variazione restano stime deterministiche finché non abbiamo
 * uno storico prezzi reale (vedi supabase/schema.sql + cron update-prices).
 */
export function pokemonTcgCardsToBubbles(cards: PokemonTcgCard[], timeframe: Timeframe): BubbleDatum[] {
  const volatility = TIMEFRAME_VOLATILITY[timeframe];

  return cards.map((card) => {
    const random = mulberry32(hashString(card.id) + TIMEFRAME_SEED[timeframe]);
    const price = extractMarketPrice(card) ?? 2 + random() * 200;
    const volume = 5 + Math.floor(random() * 200);
    const marketCap = price * volume;
    const change = (random() - 0.5) * volatility * 2;

    return {
      id: card.id,
      name: card.name,
      setName: card.set.name,
      rarity: card.rarity ?? null,
      imageUrl: card.images.small,
      tcgplayerUrl: card.tcgplayer?.url ?? null,
      price: Math.round(price * 100) / 100,
      marketCap: Math.round(marketCap),
      change: Math.round(change * 100) / 100,
    };
  });
}
