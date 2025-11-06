-- URL Fetcher: Add optional columns for URL source indexing
-- Non-breaking: all columns are optional and use IF NOT EXISTS

-- ai_sources: store settings for 'url' sources
alter table public.ai_sources
  add column if not exists settings jsonb default '{}'::jsonb;

alter table public.ai_sources
  add column if not exists last_synced_at timestamptz,
  add column if not exists doc_count int default 0,
  add column if not exists chunk_count int default 0;

-- ai_docs: hold url & hash to dedupe/refresh
alter table public.ai_docs
  add column if not exists url text,
  add column if not exists content_hash text;

create index if not exists ai_docs_content_hash_idx on public.ai_docs(content_hash);
create index if not exists ai_docs_url_idx on public.ai_docs(url) where url is not null;
-- Note: We use (source_id, external_id) unique constraint for upserts
-- For URL sources, external_id is set to the URL value

-- ai_chunks: mark embedding status
alter table public.ai_chunks
  add column if not exists needs_embedding boolean default false;

create index if not exists ai_chunks_needs_embedding_idx on public.ai_chunks(needs_embedding) where needs_embedding = true;

