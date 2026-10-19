-- Customer accounts (run once in the Supabase SQL editor; safe to run again).
--
-- Only admins create accounts. Customers can sign in, but must never get admin
-- rights. Before this, every database policy for "signed-in users" meant
-- "admins", because only admins had accounts. Now customers have accounts too,
-- so those policies must check for the admin role instead.
--
-- Also turn OFF self sign-up in the dashboard:
--   Authentication → Sign In / Providers → "Allow new users to sign up" → off.
-- Admin-created accounts keep working with sign-up turned off.

-- 1. Mark the admin accounts. app_metadata can only be written by the server
--    (service role), never by the user. Add every admin e-mail to this list.
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where lower(email) in (
  'yucellevon@gmail.com',
  'antony9922@outlook.com'
);

-- 2. is_admin(): true when the signed-in user has the admin role. Reads
--    auth.users directly, so a role change applies at once instead of waiting
--    for the user's next access token.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select u.raw_app_meta_data ->> 'role' = 'admin' from auth.users u where u.id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- 3. Every policy that grants access to "any signed-in user" now also requires
--    is_admin(). Public policies (product listing, site content, contact form)
--    are left as they are, so customers still see and use the site normally.
do $$
declare
  p record;
  stmt text;
begin
  for p in
    select schemaname, tablename, policyname, cmd, roles, qual, with_check
    from pg_policies
    where schemaname in ('public', 'storage')
      and coalesce(qual, '') not like '%is_admin()%'
      and coalesce(with_check, '') not like '%is_admin()%'
      and (
        roles = '{authenticated}'::name[]
        or coalesce(qual, '') ilike '%authenticated%'
        or coalesce(with_check, '') ilike '%authenticated%'
      )
  loop
    stmt := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    if p.qual is not null then
      stmt := stmt || format(' using ((select public.is_admin()) and (%s))', p.qual);
    end if;
    if p.with_check is not null then
      stmt := stmt || format(' with check ((select public.is_admin()) and (%s))', p.with_check);
    end if;
    if p.qual is null and p.with_check is null then
      stmt := stmt || case when p.cmd = 'INSERT'
        then ' with check ((select public.is_admin()))'
        else ' using ((select public.is_admin()))' end;
    end if;

    begin
      execute stmt;
      raise notice 'Admin only: %.% → %', p.schemaname, p.tablename, p.policyname;
    exception when others then
      raise warning 'Could not update %.% → %: %', p.schemaname, p.tablename, p.policyname, sqlerrm;
    end;
  end loop;
end $$;

-- 3b. cron_state and stock_events had "full access" policies for every role,
--     including anonymous visitors. The server uses the service role, which
--     bypasses these policies, so they only opened the tables to the public.
--     Admins keep read access to stock_events for the live stock feed.
drop policy if exists "Service role full access on cron_state" on public.cron_state;
drop policy if exists "Service role full access on stock_events" on public.stock_events;
drop policy if exists "Admins can read stock events" on public.stock_events;
create policy "Admins can read stock events"
  on public.stock_events for select to authenticated
  using ((select public.is_admin()));

-- 3c. Evaluate is_admin() once per query, not once per row. Calling it per
--     row made reads on large tables (stock_events) hit the statement timeout.
--     Rewrites policies from an earlier run of this file; safe to run again.
do $
declare
  p record;
  stmt text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname in ('public', 'storage')
      and (coalesce(qual, '') like '%is_admin()%' or coalesce(with_check, '') like '%is_admin()%')
      and coalesce(qual, '') not ilike '%select is_admin()%'
      and coalesce(with_check, '') not ilike '%select is_admin()%'
  loop
    stmt := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    if p.qual is not null then
      stmt := stmt || format(' using (%s)', replace(p.qual, 'is_admin()', '(select public.is_admin())'));
    end if;
    if p.with_check is not null then
      stmt := stmt || format(' with check (%s)', replace(p.with_check, 'is_admin()', '(select public.is_admin())'));
    end if;
    execute stmt;
  end loop;
end $;

-- 4. Check the result. Every policy for signed-in users should now contain
--    is_admin(). The second query lists tables with row level security turned
--    off — anyone with the public key can read and write those.
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

select c.relname as table_without_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
order by 1;
