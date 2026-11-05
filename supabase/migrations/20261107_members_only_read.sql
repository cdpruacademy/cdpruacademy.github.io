-- =========================================================================
-- Only people with a role can read the website's data.
-- Run once in Supabase Dashboard > SQL Editor (project bwevlsmrtbqbgsqjpppn),
-- AFTER the website with the login page is live.
--
-- The LINE bot uses the secret key, so it is not affected. Images in the
-- timeline-snapshots bucket stay public, because LINE must be able to open them.
-- =========================================================================

drop policy if exists "Public read" on public.timeline_store;
drop policy if exists "Signed-in read" on public.timeline_store;
drop policy if exists "Members read" on public.timeline_store;

create policy "Members read" on public.timeline_store
  for select to authenticated
  using (
    (select public.my_role()) is not null
    and id in (
      'current', 'latest_image', 'announcements', 'latest_announcement', 'partners',
      'team_members', 'refreshers', 'tab_access'
    )
  );

-- To undo, so anyone can read the Timeline again:
--   create policy "Public read" on public.timeline_store for select to anon, authenticated
--     using (id in ('current', 'latest_image', 'announcements', 'latest_announcement', 'partners'));
