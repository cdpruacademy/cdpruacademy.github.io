-- =========================================================================
-- Change history for the Timeline: who changed which project, and what.
-- Run once in Supabase Dashboard > SQL Editor (project bwevlsmrtbqbgsqjpppn),
-- BEFORE the website code that shows it is pushed.
--
-- The database writes the history, so the website cannot fake who made a change.
-- Only superadmins can read it. It starts from when this runs, and keeps one year.
-- If working out the history fails, the save still goes through.
-- =========================================================================

create table if not exists public.change_log (
  id bigint generated always as identity primary key,
  changed_at timestamptz not null default now(),
  actor text not null,
  month text,
  project_id text not null,
  project_name text,
  item_type text,
  action text not null check (action in ('add', 'edit', 'delete', 'pause', 'resume')),
  changes jsonb not null default '[]'::jsonb
);

create index if not exists change_log_changed_at on public.change_log (id desc);

alter table public.change_log enable row level security;
revoke all on public.change_log from anon, authenticated;
grant select on public.change_log to authenticated;

drop policy if exists "Superadmins read history" on public.change_log;
create policy "Superadmins read history" on public.change_log
  for select to authenticated
  using ((select public.is_superadmin()));

-- One row per saved copy of a project, across every month
create or replace function public.timeline_copies(store jsonb)
returns table (month text, month_date date, item_type text, item jsonb)
language sql
immutable
set search_path = ''
as $$
  select m.key, to_date('01 ' || m.key, 'DD MON YYYY'), t.item_type, i.item
  from jsonb_each(store) m
  cross join lateral (values ('product', 'products'), ('enhancement', 'enhancements')) t (item_type, list)
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(m.value -> t.list) = 'array' then m.value -> t.list else '[]'::jsonb end
  ) i (item)
  where m.key ~ '^[A-Z]{3} [0-9]{4}$' and jsonb_typeof(m.value) = 'object' and i.item ->> 'id' is not null;
$$;

-- Fields a person can change; month bookkeeping is left out on purpose
create or replace function public.project_changes(old_item jsonb, new_item jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('field', field, 'from', was, 'to', now_is) order by field), '[]'::jsonb)
  from (
    select f as field, old_item ->> f as was, new_item ->> f as now_is
    from unnest(array['name', 'owner', 'broker', 'internalDate', 'commercialDate', 'csDate', 'customRightLabel']) f
    union all
    select 'milestones.' || k || '.' || p,
      old_item #>> array['milestones', k, p],
      new_item #>> array['milestones', k, p]
    from unnest(array['kick-off', 'first-draft', 'first-draft-elearning', 'final-approval', 'final-elearning', 'internal-training', 'launch']) k
    cross join unnest(array['date', 'status', 'isElearningIcon']) p
  ) d
  -- An empty value and a missing one mean the same thing; false and missing too
  where nullif(nullif(was, ''), 'false') is distinct from nullif(nullif(now_is, ''), 'false');
$$;

create or replace function public.log_timeline_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  who text;
begin
  select u.email into who from auth.users u where u.id = auth.uid();
  who := coalesce(who, case when new.updated_by = 'cd_notify_bot' then 'CODY' else 'system' end);

  insert into public.change_log (actor, month, project_id, project_name, item_type, action, changes)
  with
    was as (
      select * from public.timeline_copies(old.data)
    ),
    is_now as (
      select * from public.timeline_copies(new.data)
    ),
    paired as (
      select n.month, n.month_date, n.item_type, n.item, prev.item as prev_item
      from is_now n
      left join lateral (
        -- The copy in the same month, else the latest one: a project carried into a new month is not new
        select w.item from was w
        where w.item ->> 'id' = n.item ->> 'id'
        order by (w.month = n.month) desc, w.month_date desc
        limit 1
      ) prev on true
    ),
    events as (
      select month, month_date, item_type, item ->> 'id' as project_id, item ->> 'name' as project_name,
        case
          when prev_item is null and (item ->> 'isDeleted')::boolean is not true then 'add'
          when (item ->> 'isDeleted')::boolean is true and (prev_item ->> 'isDeleted')::boolean is not true then 'delete'
          when item ->> 'pauseState' = 'paused' and prev_item ->> 'pauseState' is distinct from 'paused' then 'pause'
          when item ->> 'pauseState' = 'resumed' and prev_item ->> 'pauseState' is distinct from 'resumed' then 'resume'
          when (item ->> 'isDeleted')::boolean is true then null
          when public.project_changes(prev_item, item) <> '[]'::jsonb then 'edit'
        end as action,
        case when prev_item is null then '[]'::jsonb else public.project_changes(prev_item, item) end as changes
      from paired
      union all
      -- Removed from every month
      select w.month, w.month_date, w.item_type, w.item ->> 'id', w.item ->> 'name', 'delete', '[]'::jsonb
      from was w
      where (w.item ->> 'isDeleted')::boolean is not true
        and not exists (select 1 from is_now n where n.item ->> 'id' = w.item ->> 'id')
    )
  -- The same change saved on several months' copies is one change
  select distinct on (project_id, action, changes::text)
    who, month, project_id, project_name, item_type, action, changes
  from events
  where action is not null
  order by project_id, action, changes::text, month_date desc;

  return null;
exception when others then
  raise warning 'change_log failed: %', sqlerrm;
  return null;
end;
$$;

revoke all on function public.log_timeline_changes() from public, anon, authenticated;
revoke all on function public.timeline_copies(jsonb) from public, anon, authenticated;
revoke all on function public.project_changes(jsonb, jsonb) from public, anon, authenticated;

drop trigger if exists log_timeline_changes on public.timeline_store;
create trigger log_timeline_changes
  after update on public.timeline_store
  for each row
  when (old.id = 'current' and old.data is distinct from new.data)
  execute function public.log_timeline_changes();

-- Keep one year
select cron.schedule(
  'change-log-cleanup',
  '0 3 1 * *',
  $$delete from public.change_log where changed_at < now() - interval '1 year'$$
);

-- To undo:
--   drop trigger log_timeline_changes on public.timeline_store;
--   select cron.unschedule('change-log-cleanup');
--   drop table public.change_log;
