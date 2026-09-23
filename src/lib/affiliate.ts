/**
 * Configurazione centrale dei link di affiliazione.
 * Imposta queste variabili in `.env.local` (o nel pannello env del tuo host) per attivare
 * il guadagno da affiliazione: nessuna modifica al codice è necessaria.
 *
 *   NEXT_PUBLIC_TCGPLAYER_PARTNER_ID=il-tuo-id-partner-tcgplayer
 *   NEXT_PUBLIC_EBAY_CAMPAIGN_ID=il-tuo-campid-ebay
 *   NEXT_PUBLIC_SPONSOR_NAME="Nome sponsor"
 *   NEXT_PUBLIC_SPONSOR_URL=https://esempio.com/tuo-link-affiliato
 *   NEXT_PUBLIC_SPONSOR_TAGLINE="Compra carte Pokémon al miglior prezzo"
 */

const TCGPLAYER_PARTNER_ID = process.env.NEXT_PUBLIC_TCGPLAYER_PARTNER_ID ?? "";
const EBAY_CAMPAIGN_ID = process.env.NEXT_PUBLIC_EBAY_CAMPAIGN_ID ?? "";

/** Aggiunge il tag di affiliazione TCGplayer a un URL carta, se configurato. */
export function withAffiliateTag(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (TCGPLAYER_PARTNER_ID && parsed.hostname.includes("tcgplayer.com")) {
      parsed.searchParams.set("partner", TCGPLAYER_PARTNER_ID);
      parsed.searchParams.set("utm_campaign", "pokebubble");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

/** Link di ricerca eBay per la carta, con eventuale campid di affiliazione. */
export function buildEbaySearchUrl(cardName: string, setName: string): string {
  const query = encodeURIComponent(`${cardName} ${setName} pokemon card`);
  const base = `https://www.ebay.com/sch/i.html?_nkw=${query}`;
  return EBAY_CAMPAIGN_ID ? `${base}&campid=${EBAY_CAMPAIGN_ID}` : base;
}

export const sponsorSlot = {
  enabled: Boolean(process.env.NEXT_PUBLIC_SPONSOR_NAME),
  name: process.env.NEXT_PUBLIC_SPONSOR_NAME ?? "",
  url: process.env.NEXT_PUBLIC_SPONSOR_URL ?? "#",
  tagline: process.env.NEXT_PUBLIC_SPONSOR_TAGLINE ?? "",
};
