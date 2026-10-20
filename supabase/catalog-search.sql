-- Advanced catalog search (run once in the Supabase SQL editor; safe to run again).
--
-- A searchable copy of the full Turbocentras catalog: every turbocharger with
-- its OEM/brand numbers and the parts that fit it, and every turbo part with the
-- turbochargers it fits. Filled nightly by /api/cron/catalog-sync.

create extension if not exists pg_trgm;

-- 1. Turbochargers
create table if not exists public.catalog_turbos (
  id          integer primary key,          -- Turbocentras turbocharger id
  brand       text,
  series      text,
  model       text,
  reference   text,                         -- the turbo number, e.g. 49377-06200
  numbers     jsonb not null default '[]',  -- [{ "t": "OEM", "n": "1441199..." }]
  parts       jsonb not null default '[]',  -- [{ "type": "Cartridge", "ref": "GA-00-0051", "pid": "627" }]
  product_id  text,                         -- our product page, when the turbo is sold in the shop
  search      text not null default '',     -- normalised numbers for searching
  updated_at  timestamptz not null default now()
);

-- 2. Turbo parts
create table if not exists public.catalog_parts (
  id          integer primary key,          -- Turbocentras turbo part id
  reference   text not null,                -- e.g. GA-04-0015
  type        text,                         -- e.g. Repair kit
  brand       text,
  numbers     jsonb not null default '[]',  -- alternative numbers [{ "t": "BWT", "n": "..." }]
  turbo_ids   integer[] not null default '{}',
  product_id  text,
  search      text not null default '',
  updated_at  timestamptz not null default now()
);

-- 3. Fast "contains" search on the normalised numbers
create index if not exists catalog_turbos_search_trgm on public.catalog_turbos using gin (search gin_trgm_ops);
create index if not exists catalog_parts_search_trgm  on public.catalog_parts  using gin (search gin_trgm_ops);
create index if not exists catalog_parts_turbo_ids    on public.catalog_parts  using gin (turbo_ids);

-- 4. Public read-only data. Only the server (service role) writes.
alter table public.catalog_turbos enable row level security;
alter table public.catalog_parts  enable row level security;

drop policy if exists "Anyone can read catalog turbos" on public.catalog_turbos;
create policy "Anyone can read catalog turbos" on public.catalog_turbos
  for select to anon, authenticated using (true);

drop policy if exists "Anyone can read catalog parts" on public.catalog_parts;
create policy "Anyone can read catalog parts" on public.catalog_parts
  for select to anon, authenticated using (true);

-- 5. Nightly refresh (after the specs sync at 03:40)
select cron.unschedule(jobname) from cron.job where jobname = 'turboshop-catalog';
select cron.schedule('turboshop-catalog', '10 4 * * *',
  $$select net.http_get('https://turboshop-sand.vercel.app/api/cron/catalog-sync', timeout_milliseconds := 300000)$$);

select jobname, schedule from cron.job where jobname like 'turboshop-%' order by jobname;
