-- Optional helper function to refresh source counts
create or replace function public.refresh_ai_source_counts(p_source_id uuid)
returns table (doc_count int, chunk_count int)
language sql stable as $$
  select
    (select count(*)::int from public.ai_docs d where d.source_id = p_source_id),
    (select count(*)::int from public.ai_chunks c 
     where c.doc_id in (select id from public.ai_docs where source_id = p_source_id));
$$;

