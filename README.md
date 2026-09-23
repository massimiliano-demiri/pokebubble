# PokeBubble

Bubble map interattiva del mercato Pokémon TCG (stile coin360 / cryptobubbles). Ogni bolla è
una carta: dimensione = market cap stimato, colore = variazione % nel timeframe selezionato
(24h / 7g / 30g / 90g / 1 anno).

## Stack

- Next.js 14 (App Router) + React 18 + TypeScript
- D3.js v7 (`d3-force` per la simulazione fisica, rendering su `<canvas>` per 500+ bolle)
- Tailwind CSS + componenti in stile shadcn/ui
- Supabase (PostgreSQL) per storico prezzi e metriche pre-calcolate
- Cron giornaliero (Vercel Cron / GitHub Actions) per l'aggiornamento prezzi
- Hosting: Vercel

## Fonti dati (strategia a cascata)

1. **pokemontcg.io** — metadati carte + prezzi TCGPlayer/Cardmarket (gratuito, 20k req/giorno con chiave).
2. **tcgdex.dev** — fallback gratuito, trend prezzi 1/7/30 giorni, carte internazionali.
3. **tcgapi.dev / PriceCharting (Apify)** — storico profondo, POP report, a pagamento.
4. **TCGPlayer / eBay scraping** — ultima risorsa, solo con rate limiting aggressivo (attenzione ai ToS).

## Setup

```bash
npm install
cp .env.local.example .env.local
```

Compila `.env.local` con le chiavi (vedi sotto). Se `NEXT_PUBLIC_SUPABASE_URL` /
`SUPABASE_SERVICE_ROLE_KEY` non sono impostate, l'app funziona comunque mostrando un
dataset demo generato localmente (`src/lib/mock-data.ts`).

### Database

Esegui `supabase/schema.sql` nel SQL editor del progetto Supabase: crea le tabelle
`cards`, `price_snapshots`, `card_metrics`, gli indici, le policy RLS (lettura pubblica
solo su `cards`/`card_metrics`) e la funzione `recompute_card_metrics()` che ricalcola
market cap stimato e variazioni % 7g/30g/90g/1y a partire dagli snapshot prezzi.

### Variabili d'ambiente

| Variabile | Descrizione |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL progetto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chiave anon (client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chiave service role (solo server, per API/cron) |
| `POKEMONTCG_API_KEY` | Chiave pokemontcg.io (opzionale ma consigliata) |
| `CRON_SECRET` | Segreto per autenticare l'endpoint cron in produzione |
| `NEXT_PUBLIC_TCGPLAYER_PARTNER_ID` | Il tuo ID partner TCGplayer: viene aggiunto automaticamente ai link "Compra ora" |
| `NEXT_PUBLIC_EBAY_CAMPAIGN_ID` | Il tuo campid eBay: aggiunto ai link "Cerca su eBay" nel tooltip |
| `NEXT_PUBLIC_SPONSOR_NAME` | Nome sponsor mostrato nel banner in header (banner nascosto se vuoto) |
| `NEXT_PUBLIC_SPONSOR_URL` | Link (affiliato) dello sponsor |
| `NEXT_PUBLIC_SPONSOR_TAGLINE` | Testo breve mostrato accanto al nome sponsor |

### Sviluppo

```bash
npm run dev
```

### Aggiornamento prezzi (cron)

`GET /api/cron/update-prices` con header `Authorization: Bearer $CRON_SECRET` scarica i
prezzi da pokemontcg.io, aggiorna `cards`/`price_snapshots` e richiama
`recompute_card_metrics()`. Programmato via `vercel.json` (`crons`) alle 06:00 UTC.

## Struttura

```
src/
  app/
    api/cards/route.ts            # GET bolle per timeframe (Supabase o mock)
    api/cron/update-prices/route.ts
    page.tsx                      # bubble map principale
  components/bubble-map/          # BubbleMap (D3 + canvas), toggle, tooltip
  lib/
    data-sources/                 # pokemontcg.io, tcgdex.dev
    supabase/                     # client browser / server (service role)
    metrics.ts, mock-data.ts, utils.ts
  types/card.ts
supabase/schema.sql                # schema + RLS + funzione di aggregazione
```

