-- Daily backup of the team's data (timeline + announcements) inside the same database.
-- Protects against mistaken edits, deletes and overwrites. It does NOT protect against
-- losing the whole Supabase project, so keep an occasional offline export as well.
--
-- A snapshot is taken only when the row changed since its last backup, kept for 400 days.

create table if not exists public.timeline_store_backups (
  backup_id bigint generated always as identity primary key,
  backed_up_at timestamptz not null default now(),
  row_id text not null,
  data jsonb not null,
  available_months jsonb,
  active_month text,
  row_updated_at timestamptz,
  updated_by text
);

create index if not exists timeline_store_backups_row_idx
  on public.timeline_store_backups (row_id, backed_up_at desc);

-- No policies: only the SQL Editor / secret key can read or restore backups
alter table public.timeline_store_backups enable row level security;

create or replace function public.backup_timeline_store()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted integer;
begin
  insert into public.timeline_store_backups (row_id, data, available_months, active_month, row_updated_at, updated_by)
  select s.id, s.data, s.available_months, s.active_month, s.updated_at, s.updated_by
  from public.timeline_store s
  where s.id in ('current', 'announcements')
    and not exists (
      select 1
      from public.timeline_store_backups b
      where b.row_id = s.id
        and b.row_updated_at is not distinct from s.updated_at
    );
  get diagnostics inserted = row_count;

  delete from public.timeline_store_backups where backed_up_at < now() - interval '400 days';
  return inserted;
end;
$$;

revoke all on function public.backup_timeline_store() from public, anon, authenticated;

-- Every day at 00:00 Bangkok time (17:00 UTC)
select cron.schedule('daily-timeline-backup', '0 17 * * *', $$select public.backup_timeline_store()$$);

-- ---------------------------------------------------------------------------
-- RESTORE (run by hand in the SQL Editor)
--
-- 1. List backups of the timeline:
--    select backup_id, backed_up_at, row_updated_at, updated_by
--    from public.timeline_store_backups where row_id = 'current'
--    order by backed_up_at desc;
--
-- 2. Back up the current state first, then restore the chosen backup_id:
--    select public.backup_timeline_store();
--    update public.timeline_store s
--    set data = b.data, available_months = b.available_months, updated_at = now(), updated_by = 'restore'
--    from public.timeline_store_backups b
--    where b.backup_id = <backup_id> and s.id = b.row_id;
--
-- 3. Ask everyone to reload the website.
-- ---------------------------------------------------------------------------
