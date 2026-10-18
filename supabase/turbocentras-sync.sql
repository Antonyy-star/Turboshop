-- Turbocentras sync setup (run once in the Supabase SQL editor).

-- 1. Only this site may change stock. Requests from the site carry the header
--    x-turboshop-client: site. Stock changes from any other API client (old scraper
--    scripts running elsewhere) are ignored, and their stock_events are dropped.
--    Direct SQL (dashboard, migrations) is not affected.
create or replace function public.guard_foreign_stock_writes()
returns trigger
language plpgsql
as $fn$
declare
  hdrs json;
begin
  begin
    hdrs := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    hdrs := null;
  end;
  if hdrs is null or coalesce(hdrs->>'x-turboshop-client', '') = 'site' then
    return new;
  end if;
  if tg_table_name = 'products' then
    new.in_stock := old.in_stock;
    return new;
  end if;
  return null;
end;
$fn$;

drop trigger if exists guard_products_stock on public.products;
create trigger guard_products_stock
  before update of in_stock on public.products
  for each row execute function public.guard_foreign_stock_writes();

drop trigger if exists guard_stock_events on public.stock_events;
create trigger guard_stock_events
  before insert on public.stock_events
  for each row execute function public.guard_foreign_stock_writes();

-- 2. Schedules (Vercel's free plan only allows daily crons, so Supabase pg_cron pings the site).
--    The endpoints throttle themselves, so these pings can't overload Turbocentras.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobname) from cron.job where jobname like 'turboshop-%';

select cron.schedule('turboshop-stock', '*/5 * * * *',
  $$select net.http_get('https://turboshop-sand.vercel.app/api/cron/stock-check', timeout_milliseconds := 60000)$$);
select cron.schedule('turboshop-products', '20 * * * *',
  $$select net.http_get('https://turboshop-sand.vercel.app/api/cron/product-sync', timeout_milliseconds := 300000)$$);
select cron.schedule('turboshop-specs', '40 3 * * *',
  $$select net.http_get('https://turboshop-sand.vercel.app/api/cron/specs-sync', timeout_milliseconds := 300000)$$);

select jobname, schedule from cron.job where jobname like 'turboshop-%';
