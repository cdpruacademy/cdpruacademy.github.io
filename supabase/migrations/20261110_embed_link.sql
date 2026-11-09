-- =========================================================================
-- A link for another website to show Timeline and Analytics without a login.
-- The link carries a long random code. Only embed_data() checks it, and it
-- returns only the rows those two pages read; KPI scores, users, the change
-- history and every other row stay members only. Superadmins make a new code
-- on /users, which stops the old link at once, or turn the link off.
-- Safe to run twice.
-- =========================================================================

create table if not exists public.embed_link (
  id int primary key default 1 check (id = 1),
  token text not null,
  created_at timestamptz not null default now()
);
-- No policies: nobody reads or writes this table through the API, only the functions below
alter table public.embed_link enable row level security;
revoke all on public.embed_link from anon, authenticated;

-- The rows Timeline and Analytics read, or null when the code is wrong or the link is off
create or replace function public.embed_data(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when length(coalesce(p_token, '')) >= 32
      and exists (select 1 from public.embed_link where token = p_token)
    then jsonb_build_object(
      'rows',
      coalesce(
        (select jsonb_object_agg(
           id,
           jsonb_build_object(
             'data', data,
             'available_months', available_months,
             'active_month', active_month,
             'updated_at', updated_at
           ))
         from public.timeline_store
         where id in ('current', 'partners', 'team_members', 'refreshers', 'audits')),
        '{}'::jsonb
      )
    )
  end;
$$;

-- The current link code and when it was made (superadmin only)
create or replace function public.get_embed_link()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not coalesce(public.my_role() = 'superadmin', false) then
    raise exception 'superadmin only';
  end if;
  return (select jsonb_build_object('token', token, 'created_at', created_at) from public.embed_link where id = 1);
end;
$$;

-- A new code; the old link stops working (superadmin only)
create or replace function public.new_embed_link()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  t text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  if not coalesce(public.my_role() = 'superadmin', false) then
    raise exception 'superadmin only';
  end if;
  insert into public.embed_link (id, token, created_at) values (1, t, now())
  on conflict (id) do update set token = excluded.token, created_at = excluded.created_at;
  return jsonb_build_object('token', t, 'created_at', now());
end;
$$;

-- Turn the link off (superadmin only)
create or replace function public.stop_embed_link()
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not coalesce(public.my_role() = 'superadmin', false) then
    raise exception 'superadmin only';
  end if;
  delete from public.embed_link where id = 1;
end;
$$;

revoke all on function public.embed_data(text) from public, anon, authenticated;
revoke all on function public.get_embed_link() from public, anon, authenticated;
revoke all on function public.new_embed_link() from public, anon, authenticated;
revoke all on function public.stop_embed_link() from public, anon, authenticated;
grant execute on function public.embed_data(text) to anon, authenticated;
grant execute on function public.get_embed_link() to authenticated;
grant execute on function public.new_embed_link() to authenticated;
grant execute on function public.stop_embed_link() to authenticated;

-- To undo:
--   drop function if exists public.embed_data(text), public.get_embed_link(),
--     public.new_embed_link(), public.stop_embed_link();
--   drop table if exists public.embed_link;
