-- =========================================================================
-- One login per person, with roles: superadmin, editor, viewer.
-- Run once in Supabase Dashboard > SQL Editor (project bwevlsmrtbqbgsqjpppn),
-- BEFORE the website code that uses it is pushed. The old site keeps working
-- after this runs: every account in admin_users becomes a superadmin.
--
--   superadmin  everything, including KPI scores and managing users
--   editor      edits Timeline, Refresher, Announcements, Partners, team list
--   viewer      reads only
--
-- Public reading of the Timeline rows does not change.
-- public.admin_users is left in place, unused, so this can be undone.
-- =========================================================================

-- 1. Who has which role ----------------------------------------------------
create table if not exists public.user_roles (
  email text primary key check (email = lower(email)),
  role text not null check (role in ('superadmin', 'editor', 'viewer')),
  created_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

insert into public.user_roles (email, role)
select email, 'superadmin' from public.admin_users
on conflict do nothing;

-- The email comes from auth.users, not the login token, so it is always the
-- confirmed address of the account that is signed in.
create or replace function public.my_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select r.role
  from auth.users u
  join public.user_roles r on r.email = lower(u.email)
  where u.id = auth.uid()
    and u.email_confirmed_at is not null;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.my_role() in ('superadmin', 'editor'), false);
$$;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.my_role() = 'superadmin', false);
$$;

revoke all on function public.my_role() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.is_superadmin() from public;
grant execute on function public.my_role() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_superadmin() to anon, authenticated;

grant select, insert, update, delete on public.user_roles to authenticated;

drop policy if exists "Superadmins manage roles" on public.user_roles;
create policy "Superadmins manage roles" on public.user_roles
  for all to authenticated
  using ((select public.is_superadmin()))
  with check ((select public.is_superadmin()));

-- 2. Never lose the last superadmin who can actually sign in ---------------
create or replace function public.keep_one_superadmin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'superadmin'
     and (tg_op = 'DELETE' or new.role <> 'superadmin')
     and not exists (
       select 1
       from public.user_roles r
       join auth.users u on lower(u.email) = r.email
       where r.role = 'superadmin'
         and r.email <> old.email
         and u.email_confirmed_at is not null
     )
  then
    raise exception 'ต้องมี Superadmin ที่มีบัญชีอย่างน้อย 1 คน';
  end if;
  return coalesce(new, old);
end;
$$;

revoke all on function public.keep_one_superadmin() from public;

drop trigger if exists keep_one_superadmin on public.user_roles;
create trigger keep_one_superadmin
  before update or delete on public.user_roles
  for each row execute function public.keep_one_superadmin();

-- 3. The user list on the Users page, with whether each person has an account
create or replace function public.list_user_roles()
returns table (email text, role text, has_account boolean, last_sign_in_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_superadmin() then
    raise exception 'superadmin only';
  end if;
  return query
    select r.email, r.role, u.id is not null, u.last_sign_in_at
    from public.user_roles r
    left join auth.users u on lower(u.email) = r.email
    order by r.email;
end;
$$;

revoke all on function public.list_user_roles() from public;
grant execute on function public.list_user_roles() to authenticated;

-- 4. New rows --------------------------------------------------------------
-- Refresher lessons move out of the KPI scores, so editors can use them without
-- seeing scores. The old copy stays in difficulty_scores until the next KPI save.
insert into public.timeline_store (id, data, updated_at, updated_by)
select
  'refreshers',
  jsonb_build_object('items', coalesce(d.data -> 'refreshers', '[]'::jsonb)),
  now(),
  'migration'
from (select 1) one
left join public.timeline_store d on d.id = 'difficulty_scores'
on conflict (id) do nothing;

-- Which optional tabs each role sees. Timeline is always on; KPI and Users are superadmin only.
insert into public.timeline_store (id, data, updated_at, updated_by)
values (
  'tab_access',
  '{"editor": ["/analytics", "/announcements", "/partners"], "viewer": ["/analytics", "/announcements"]}'::jsonb,
  now(),
  'migration'
)
on conflict (id) do nothing;

-- 5. timeline_store rules --------------------------------------------------
-- "Admins write" also let every admin read every row, so it goes.
drop policy if exists "Admins write" on public.timeline_store;
drop policy if exists "Superadmins all" on public.timeline_store;
drop policy if exists "Signed-in read" on public.timeline_store;
drop policy if exists "Editors insert" on public.timeline_store;
drop policy if exists "Editors update" on public.timeline_store;

create policy "Superadmins all" on public.timeline_store
  for all to authenticated
  using ((select public.is_superadmin()))
  with check ((select public.is_superadmin()));

create policy "Signed-in read" on public.timeline_store
  for select to authenticated
  using (
    (select public.my_role()) is not null
    and id in ('team_members', 'refreshers', 'tab_access')
  );

create policy "Editors insert" on public.timeline_store
  for insert to authenticated
  with check (
    (select public.is_admin())
    and id in ('current', 'latest_image', 'announcements', 'latest_announcement', 'partners', 'team_members', 'refreshers')
  );

create policy "Editors update" on public.timeline_store
  for update to authenticated
  using (
    (select public.is_admin())
    and id in ('current', 'latest_image', 'announcements', 'latest_announcement', 'partners', 'team_members', 'refreshers')
  )
  with check (
    (select public.is_admin())
    and id in ('current', 'latest_image', 'announcements', 'latest_announcement', 'partners', 'team_members', 'refreshers')
  );

-- Storage keeps its policies: they call is_admin(), which now means superadmin or editor.

-- To undo: drop the four policies above, then run
--   create policy "Admins write" on public.timeline_store for all to authenticated
--     using ((select public.is_admin())) with check ((select public.is_admin()));
-- with is_admin() restored from 20261026_lock_down_rls.sql.
