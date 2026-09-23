export type Timeframe = "24h" | "7d" | "30d" | "90d" | "1y";

export interface Card {
  id: string;
  externalId: string | null;
  name: string;
  setName: string;
  setCode: string | null;
  cardNumber: string | null;
  rarity: string | null;
  imageUrl: string | null;
  tcgplayerUrl: string | null;
}

export interface CardMetrics {
  cardId: string;
  marketCapEstimate: number;
  change24h: number | null;
  change7d: number | null;
  change30d: number | null;
  change90d: number | null;
  change1y: number | null;
  lastUpdated: string | null;
}

export type PriceSource = "tcgplayer" | "cardmarket" | "pricecharting";

export interface PriceSnapshot {
  cardId: string;
  date: string;
  marketPrice: number | null;
  lowPrice: number | null;
  highPrice: number | null;
  volume: number;
  source: PriceSource;
}

/** Flattened datum consumed by the d3-force simulation / bubble map canvas. */
export interface BubbleDatum {
  id: string;
  name: string;
  setName: string;
  rarity?: string | null;
  imageUrl: string | null;
  tcgplayerUrl: string | null;
  price: number;
  marketCap: number;
  change: number;
  radius?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface CardsApiResponse {
  source: "supabase" | "mock" | "mock-fallback";
  timeframe: Timeframe;
  bubbles: BubbleDatum[];
}
