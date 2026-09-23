import { NextRequest, NextResponse } from "next/server";
import { isSupabaseServerConfigured, getSupabaseServerClient } from "@/lib/supabase/server";
import { generateMockBubbles } from "@/lib/mock-data";
import { fetchPokemonTcgCards, pokemonTcgCardsToBubbles } from "@/lib/data-sources/pokemontcg";
import type { BubbleDatum, CardsApiResponse, Timeframe } from "@/types/card";

const TIMEFRAMES: Timeframe[] = ["24h", "7d", "30d", "90d", "1y"];
const CHANGE_COLUMN: Record<Timeframe, "change_24h" | "change_7d" | "change_30d" | "change_90d" | "change_1y"> = {
  "24h": "change_24h",
  "7d": "change_7d",
  "30d": "change_30d",
  "90d": "change_90d",
  "1y": "change_1y",
};

function parseTimeframe(value: string | null): Timeframe {
  return (TIMEFRAMES as string[]).includes(value ?? "") ? (value as Timeframe) : "24h";
}

interface CardMetricsRow {
  market_cap_estimate: number | null;
  change_24h: number | null;
  change_7d: number | null;
  change_30d: number | null;
  change_90d: number | null;
  change_1y: number | null;
  cards: {
    id: string;
    name: string;
    set_name: string;
    rarity: string | null;
    image_url: string | null;
    tcgplayer_url: string | null;
  } | null;
}

export async function GET(request: NextRequest) {
  const timeframe = parseTimeframe(request.nextUrl.searchParams.get("timeframe"));

  if (!isSupabaseServerConfigured) {
    try {
      const cards = await fetchPokemonTcgCards({ pageSize: 250 });
      if (cards.length > 0) {
        const payload: CardsApiResponse = {
          source: "mock",
          timeframe,
          bubbles: pokemonTcgCardsToBubbles(cards, timeframe),
        };
        return NextResponse.json(payload);
      }
    } catch (error) {
      console.error("Failed to fetch pokemontcg.io catalog, falling back to synthetic mock data", error);
    }
    const payload: CardsApiResponse = { source: "mock", timeframe, bubbles: generateMockBubbles(timeframe) };
    return NextResponse.json(payload);
  }

  try {
    const supabase = getSupabaseServerClient();
    const changeColumn = CHANGE_COLUMN[timeframe];
    const { data, error } = await supabase
      .from("card_metrics")
      .select(
        `market_cap_estimate, change_24h, change_7d, change_30d, change_90d, change_1y, cards ( id, name, set_name, rarity, image_url, tcgplayer_url )`
      )
      .order("market_cap_estimate", { ascending: false })
      .limit(500)
      .returns<CardMetricsRow[]>();

    if (error) throw error;

    const bubbles: BubbleDatum[] = (data ?? [])
      .filter((row): row is CardMetricsRow & { cards: NonNullable<CardMetricsRow["cards"]> } => row.cards != null)
      .map((row) => ({
        id: row.cards.id,
        name: row.cards.name,
        setName: row.cards.set_name,
        rarity: row.cards.rarity,
        imageUrl: row.cards.image_url,
        tcgplayerUrl: row.cards.tcgplayer_url,
        price: 0,
        marketCap: Number(row.market_cap_estimate ?? 0),
        change: Number(row[changeColumn] ?? 0),
      }));

    const payload: CardsApiResponse = { source: "supabase", timeframe, bubbles };
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Failed to load card metrics from Supabase, falling back to mock data", error);
    const payload: CardsApiResponse = {
      source: "mock-fallback",
      timeframe,
      bubbles: generateMockBubbles(timeframe),
    };
    return NextResponse.json(payload);
  }
}
