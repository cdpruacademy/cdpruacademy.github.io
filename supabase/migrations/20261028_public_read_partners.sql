-- Partners and their channels live in timeline_store row id 'partners'.
-- Everyone may read it (the timeline colours come from it); writes stay admin-only.
drop policy if exists "Public read" on public.timeline_store;

create policy "Public read" on public.timeline_store
  for select to anon, authenticated
  using (id in ('current', 'latest_image', 'announcements', 'latest_announcement', 'partners'));
