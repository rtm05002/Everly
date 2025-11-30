-- ai_docs must be unique per source/external
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ai_docs_source_extid_key'
  ) then
    alter table public.ai_docs
    add constraint ai_docs_source_extid_key unique (source_id, external_id);
  end if;
end$$;

-- ai_chunks must be unique per (doc_id, idx)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ai_chunks_doc_idx_key'
  ) then
    alter table public.ai_chunks
    add constraint ai_chunks_doc_idx_key unique (doc_id, idx);
  end if;
end$$;

-- helpful indexes
create index if not exists ai_sources_hub_kind_idx on public.ai_sources (hub_id, kind);
create index if not exists ai_docs_content_hash_idx on public.ai_docs (content_hash);

-- vector index for pgvector (adjust lists as needed). Only index rows with embeddings.
-- NOTE: requires pgvector extension already installed.
create index if not exists ai_chunks_embedding_ivfflat_idx
  on public.ai_chunks using ivfflat (embedding vector_cosine_ops)
  where needs_embedding = false;



