-- =========================================================================
-- Audit work lives in its own row, like Refresher: never on the Timeline, the
-- LINE images or CODY, but counted on Analytics and KPI.
-- Run once in Supabase Dashboard > SQL Editor (project bwevlsmrtbqbgsqjpppn),
-- AFTER the website that shows Audit is live. Safe to run twice.
-- =========================================================================

-- 1. Who can read and save the new row
drop policy if exists "Members read" on public.timeline_store;
create policy "Members read" on public.timeline_store
  for select to authenticated
  using (
    (select public.my_role()) is not null
    and id in (
      'current', 'latest_image', 'announcements', 'latest_announcement', 'partners',
      'team_members', 'refreshers', 'tab_access', 'audits'
    )
  );

drop policy if exists "Editors insert" on public.timeline_store;
create policy "Editors insert" on public.timeline_store
  for insert to authenticated
  with check (
    (select public.is_admin())
    and id in ('current', 'latest_image', 'announcements', 'latest_announcement', 'partners', 'team_members', 'refreshers', 'audits')
  );

drop policy if exists "Editors update" on public.timeline_store;
create policy "Editors update" on public.timeline_store
  for update to authenticated
  using (
    (select public.is_admin())
    and id in ('current', 'latest_image', 'announcements', 'latest_announcement', 'partners', 'team_members', 'refreshers', 'audits')
  )
  with check (
    (select public.is_admin())
    and id in ('current', 'latest_image', 'announcements', 'latest_announcement', 'partners', 'team_members', 'refreshers', 'audits')
  );

-- 2. Move Periodic Review 2026 off the Timeline. Its file count is entered on the site.
insert into public.timeline_store (id, data, updated_at, updated_by)
values (
  'audits',
  jsonb_build_object('items', jsonb_build_array(jsonb_build_object(
    'id', 'audit-periodic-review-2026',
    'year', 2026,
    'title', 'Periodic Review 2026',
    'owner', 'Nitikan B.',
    'date', '11 Dec 2026',
    'files', 0,
    'done', false
  ))),
  now(),
  'migration'
)
on conflict (id) do nothing;

-- Every month's copy; the change history records this as a delete by "system"
update public.timeline_store s
set
  data = (
    select jsonb_object_agg(
      m.key,
      case
        when jsonb_typeof(m.value -> 'enhancements') = 'array' then jsonb_set(
          m.value,
          '{enhancements}',
          coalesce(
            (
              select jsonb_agg(e.item order by e.pos)
              from jsonb_array_elements(m.value -> 'enhancements') with ordinality e (item, pos)
              where e.item ->> 'id' <> 'enh-1789713428826'
            ),
            '[]'::jsonb
          )
        )
        else m.value
      end
    )
    from jsonb_each(s.data) m
  ),
  updated_at = now(),
  updated_by = 'migration'
where s.id = 'current'
  and s.data::text like '%enh-1789713428826%';

-- To undo: restore row current from timeline_store_backups, delete row audits,
-- and take 'audits' back out of the three policies above.
