import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { extractMarketPrice, fetchPokemonTcgCards, type PokemonTcgCard } from "@/lib/data-sources/pokemontcg";

export const maxDuration = 300;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production"; // require a secret in production
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function bestPrices(card: PokemonTcgCard): { market: number | null; low: number | null; high: number | null } {
  const variants = card.tcgplayer?.prices ? Object.values(card.tcgplayer.prices) : [];
  const variant = variants.find((v) => typeof v.market === "number");
  return {
    market: extractMarketPrice(card),
    low: variant?.low ?? null,
    high: variant?.high ?? null,
  };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const supabase = getSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);
  const pageSize = 250;
  let page = 1;
  let processed = 0;

  try {
    for (;;) {
      const cards = await fetchPokemonTcgCards({ page, pageSize });
      if (cards.length === 0) break;

      for (const card of cards) {
        const prices = bestPrices(card);
        if (prices.market == null) continue;

        const { data: upsertedCard, error: cardError } = await supabase
          .from("cards")
          .upsert(
            {
              external_id: card.id,
              name: card.name,
              set_name: card.set.name,
              set_code: card.set.id,
              card_number: card.number,
              rarity: card.rarity ?? null,
              image_url: card.images?.large ?? card.images?.small ?? null,
              tcgplayer_url: card.tcgplayer?.url ?? null,
            },
            { onConflict: "external_id" }
          )
          .select("id")
          .single();

        if (cardError || !upsertedCard) {
          console.error("Failed to upsert card", card.id, cardError);
          continue;
        }

        const { error: snapshotError } = await supabase.from("price_snapshots").upsert(
          {
            card_id: upsertedCard.id,
            date: today,
            market_price: prices.market,
            low_price: prices.low,
            high_price: prices.high,
            volume: 0,
            source: "tcgplayer",
          },
          { onConflict: "card_id,date,source" }
        );

        if (snapshotError) {
          console.error("Failed to upsert price snapshot", card.id, snapshotError);
          continue;
        }

        processed += 1;
      }

      if (cards.length < pageSize) break;
      page += 1;
    }

    const { error: rpcError } = await supabase.rpc("recompute_card_metrics");
    if (rpcError) throw rpcError;

    return NextResponse.json({ ok: true, processed });
  } catch (error) {
    console.error("Cron update-prices failed", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
