-- Open tabs get each other's saves straight away. RLS still decides who receives which row.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'timeline_store'
  ) then
    alter publication supabase_realtime add table public.timeline_store;
  end if;
end $$;
