-- =========================================================================
-- Lock down timeline_store + timeline-snapshots storage
-- Run once in Supabase Dashboard > SQL Editor (project bwevlsmrtbqbgsqjpppn).
--
-- After this migration:
--   * Anyone can READ the public rows (timeline, announcements, latest images).
--   * Only signed-in users whose email is in public.admin_users can WRITE.
--   * Only the rows the website needs are public. LINE bot rows
--     (line_group_info, line_lead_rooms, search_state_<LINE user id>) are
--     hidden; the GAS bot reads/writes them with the secret key.
-- =========================================================================

-- 1. Admin allowlist -------------------------------------------------------
create table if not exists public.admin_users (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
-- No policies on purpose: only the SQL Editor / secret key can manage admins.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users a
    where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- 2. timeline_store ------------------------------------------------------
alter table public.timeline_store enable row level security;

drop policy if exists "Allow public read" on public.timeline_store;
drop policy if exists "Allow anon write" on public.timeline_store;
drop policy if exists "Public read" on public.timeline_store;
drop policy if exists "Admins write" on public.timeline_store;

create policy "Public read" on public.timeline_store
  for select to anon, authenticated
  using (id in ('current', 'latest_image', 'announcements', 'latest_announcement'));

create policy "Admins write" on public.timeline_store
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- 3. Storage bucket timeline-snapshots ------------------------------------
-- Drop every existing policy that mentions this bucket (names unknown),
-- then recreate admin-only write policies. Reads go through public URLs.
do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and (coalesce(qual, '') || coalesce(with_check, '')) like '%timeline-snapshots%'
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;

create policy "timeline-snapshots admin select" on storage.objects
  for select to authenticated
  using (bucket_id = 'timeline-snapshots' and (select public.is_admin()));

create policy "timeline-snapshots admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'timeline-snapshots' and (select public.is_admin()));

create policy "timeline-snapshots admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'timeline-snapshots' and (select public.is_admin()))
  with check (bucket_id = 'timeline-snapshots' and (select public.is_admin()));

create policy "timeline-snapshots admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'timeline-snapshots' and (select public.is_admin()));

-- 4. Shared team admin account --------------------------------------------
-- Create it in Authentication > Users > Add user (Auto Confirm User ticked).
-- Must match TEAM_ADMIN_EMAIL in lib/supabase.ts.
insert into public.admin_users (email) values
  ('cdpruacademy@gmail.com')
on conflict do nothing;

-- 5. Review: any remaining storage policy that still allows anon writes?
-- Policies here that are NOT about timeline-snapshots (e.g. "allow all" with
-- qual = true) also apply to this bucket and should be removed by hand.
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;
