-- Orders (run once in the Supabase SQL editor; safe to run again).
--
-- Only signed-in customers can order. Orders are created and changed by the
-- server only (service role); prices are recalculated there, never trusted from
-- the browser. Customers can read their own orders, admins can read all.

create sequence if not exists public.order_number_seq start 1001;

create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  order_number      integer not null unique default nextval('public.order_number_seq'),
  user_id           uuid references auth.users(id) on delete set null,
  customer          jsonb not null,               -- snapshot: name, email, telefon, foretag, orgnr, adress, postnummer, ort
  items             jsonb not null,               -- [{ product_id, sku, name, brand, image, unit_price, price, qty, line_total, in_stock }]
  subtotal          numeric(12,2) not null,       -- before the customer discount
  discount_percent  numeric(4,1)  not null default 0,
  discount_amount   numeric(12,2) not null default 0,
  total             numeric(12,2) not null,       -- what the customer pays (incl. VAT, excl. delivery)
  payment_method    text not null check (payment_method in ('invoice', 'card')),
  payment_status    text not null default 'unpaid' check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded')),
  status            text not null default 'new' check (status in ('new', 'processing', 'ready', 'completed', 'cancelled')),
  reference         text,                         -- the customer's own reference / PO number
  message           text,                         -- message from the customer
  admin_note        text,                         -- internal, never shown to the customer
  stripe_session_id text,
  paid_at           timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists orders_user_created on public.orders (user_id, created_at desc);
create index if not exists orders_created on public.orders (created_at desc);
create index if not exists orders_stripe_session on public.orders (stripe_session_id);

alter table public.orders enable row level security;

drop policy if exists "Customers read own orders" on public.orders;
create policy "Customers read own orders" on public.orders
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Admins read all orders" on public.orders;
create policy "Admins read all orders" on public.orders
  for select to authenticated using ((select public.is_admin()));

-- No insert/update/delete policies: only the server (service role) writes.

select count(*) as orders from public.orders;
