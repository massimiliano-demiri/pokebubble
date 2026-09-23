-- PokeBubble: schema Supabase (PostgreSQL)

create extension if not exists pgcrypto;

-- Tabella carte
create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,        -- ID da pokemontcg.io o tcgapi
  name text not null,
  set_name text not null,
  set_code text,
  card_number text,
  rarity text,
  image_url text,
  tcgplayer_url text,             -- URL per affiliazione
  created_at timestamptz default now()
);

-- Tabella snapshot prezzi (una riga per carta per giorno per fonte)
create table if not exists price_snapshots (
  id bigserial primary key,
  card_id uuid references cards(id) on delete cascade,
  date date not null,
  market_price numeric(10,2),
  low_price numeric(10,2),
  high_price numeric(10,2),
  volume integer default 0,
  source text,                    -- 'tcgplayer', 'cardmarket', 'pricecharting'
  unique(card_id, date, source)
);

-- Tabella metriche aggregate (pre-calcolate per performance)
create table if not exists card_metrics (
  card_id uuid references cards(id) on delete cascade primary key,
  market_cap_estimate numeric(12,2),  -- prezzo x volume stimato
  change_24h numeric(6,2),
  change_7d numeric(6,2),
  change_30d numeric(6,2),
  change_90d numeric(6,2),
  change_1y numeric(6,2),
  last_updated timestamptz
);

create index if not exists idx_price_snapshots_card_date on price_snapshots (card_id, date desc);
create index if not exists idx_card_metrics_market_cap on card_metrics (market_cap_estimate desc);

-- Row Level Security: solo dati aggregati/pubblici leggibili dal client anon.
-- price_snapshots resta accessibile solo alla service role (usata dalle API/cron server-side).
alter table cards enable row level security;
alter table price_snapshots enable row level security;
alter table card_metrics enable row level security;

drop policy if exists "Public read access to cards" on cards;
create policy "Public read access to cards" on cards for select using (true);

drop policy if exists "Public read access to card_metrics" on card_metrics;
create policy "Public read access to card_metrics" on card_metrics for select using (true);

-- Funzione di aggregazione: ricalcola market cap stimato e variazioni % per timeframe.
create or replace function recompute_card_metrics()
returns void
language plpgsql
as $$
begin
  insert into card_metrics (card_id, market_cap_estimate, change_24h, change_7d, change_30d, change_90d, change_1y, last_updated)
  select
    latest.card_id,
    latest.market_price * coalesce(vol.avg_volume, 1) as market_cap_estimate,
    case when p1.market_price > 0
      then round(((latest.market_price - p1.market_price) / p1.market_price * 100)::numeric, 2)
      else null end as change_24h,
    case when p7.market_price > 0
      then round(((latest.market_price - p7.market_price) / p7.market_price * 100)::numeric, 2)
      else null end as change_7d,
    case when p30.market_price > 0
      then round(((latest.market_price - p30.market_price) / p30.market_price * 100)::numeric, 2)
      else null end as change_30d,
    case when p90.market_price > 0
      then round(((latest.market_price - p90.market_price) / p90.market_price * 100)::numeric, 2)
      else null end as change_90d,
    case when p365.market_price > 0
      then round(((latest.market_price - p365.market_price) / p365.market_price * 100)::numeric, 2)
      else null end as change_1y,
    now()
  from (
    select distinct on (card_id) card_id, market_price, date
    from price_snapshots
    order by card_id, date desc
  ) latest
  left join lateral (
    select market_price from price_snapshots s
    where s.card_id = latest.card_id and s.date <= latest.date - interval '1 day'
    order by s.date desc limit 1
  ) p1 on true
  left join lateral (
    select market_price from price_snapshots s
    where s.card_id = latest.card_id and s.date <= latest.date - interval '7 days'
    order by s.date desc limit 1
  ) p7 on true
  left join lateral (
    select market_price from price_snapshots s
    where s.card_id = latest.card_id and s.date <= latest.date - interval '30 days'
    order by s.date desc limit 1
  ) p30 on true
  left join lateral (
    select market_price from price_snapshots s
    where s.card_id = latest.card_id and s.date <= latest.date - interval '90 days'
    order by s.date desc limit 1
  ) p90 on true
  left join lateral (
    select market_price from price_snapshots s
    where s.card_id = latest.card_id and s.date <= latest.date - interval '365 days'
    order by s.date desc limit 1
  ) p365 on true
  left join (
    select card_id, avg(volume) as avg_volume
    from price_snapshots
    where date >= current_date - interval '30 days'
    group by card_id
  ) vol on vol.card_id = latest.card_id
  on conflict (card_id) do update set
    market_cap_estimate = excluded.market_cap_estimate,
    change_24h = excluded.change_24h,
    change_7d = excluded.change_7d,
    change_30d = excluded.change_30d,
    change_90d = excluded.change_90d,
    change_1y = excluded.change_1y,
    last_updated = excluded.last_updated;
end;
$$;
