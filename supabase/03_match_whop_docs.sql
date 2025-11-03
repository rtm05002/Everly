-- Semantic search function for Whop docs using pgvector cosine similarity
create or replace function public.match_whop_docs(
  query_embedding vector(1536),
  match_count int,
  hub text
)
returns table (
  id uuid,
  hub_id text,
  source text,
  external_id text,
  title text,
  url text,
  content text,
  chunk_index int,
  similarity float
)
language sql stable as $$
  select
    d.id, 
    d.hub_id, 
    d.source, 
    d.external_id, 
    d.title, 
    d.url, 
    d.content, 
    d.chunk_index,
    1 - (d.embedding <=> query_embedding) as similarity
  from public.whop_docs d
  where d.hub_id = hub
  order by d.embedding <=> query_embedding
  limit match_count;
$$;

