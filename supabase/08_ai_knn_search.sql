-- Semantic search function for AI content using pgvector KNN
-- Searches across ai_chunks joined with ai_docs and ai_sources
-- Uses cosine similarity (<=> operator) for vector search
create or replace function public.ai_knn_search(
  p_hub_id text,
  p_query_vec vector(1536),
  p_k int default 12
)
returns table (
  chunk_id uuid,
  doc_id uuid,
  text text,
  score float,
  source_kind text,
  url text,
  title text
)
language sql stable as $$
  select 
    c.id as chunk_id,
    d.id as doc_id,
    c.content as text,
    1 - (c.embedding <=> p_query_vec) as score,
    s.kind as source_kind,
    d.url,
    d.title
  from public.ai_chunks c
  join public.ai_docs d on d.id = c.doc_id
  join public.ai_sources s on s.id = d.source_id
  where s.hub_id = p_hub_id
    and c.embedding is not null
  order by c.embedding <=> p_query_vec
  limit p_k
$$;



