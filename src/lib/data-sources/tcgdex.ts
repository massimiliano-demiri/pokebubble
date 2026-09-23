const BASE_URL = "https://api.tcgdex.net/v2/en";

export interface TcgdexCardBrief {
  id: string;
  localId: string;
  name: string;
  image?: string;
}

export interface TcgdexCardPricing {
  cardmarket?: {
    avg?: number;
    trend?: number;
    avg7?: number;
    avg30?: number;
  };
}

/** Livello 1 fallback (gratuito, senza limiti hard): tcgdex.dev, con trend prezzi 1/7/30 giorni. */
export async function fetchTcgdexSetCards(setId: string): Promise<TcgdexCardBrief[]> {
  const res = await fetch(`${BASE_URL}/sets/${setId}`, { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`tcgdex.dev request failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as { cards?: TcgdexCardBrief[] };
  return json.cards ?? [];
}

export async function fetchTcgdexCardPricing(cardId: string): Promise<TcgdexCardPricing | null> {
  const res = await fetch(`${BASE_URL}/cards/${cardId}`, { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  const json = (await res.json()) as { pricing?: TcgdexCardPricing };
  return json.pricing ?? null;
}
