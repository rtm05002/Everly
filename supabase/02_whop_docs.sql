-- Enable pgvector extension
create extension if not exists vector;

-- Whop documents table for RAG
create table if not exists public.whop_docs (
  id uuid primary key default gen_random_uuid(),
  hub_id text not null,
  source text not null,              -- 'forum' | 'doc' | 'announcement' | 'faq' | ...
  external_id text not null,         -- Whop item id
  title text,
  url text,
  content text not null,
  chunk_index int not null default 0,
  doc_hash text not null,            -- hash(title+content) for idempotent upserts
  updated_at timestamptz not null default now(),
  embedding vector(1536)
);

-- Indexes for performance
create index if not exists idx_whop_docs_hub on public.whop_docs(hub_id);
create index if not exists idx_whop_docs_source on public.whop_docs(source);
create index if not exists idx_whop_docs_updated on public.whop_docs(updated_at desc);
create index if not exists idx_whop_docs_embedding on public.whop_docs using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Unique constraint for idempotent upserts
create unique index if not exists idx_whop_docs_unique on public.whop_docs(hub_id, external_id, chunk_index);

-- RLS policies
alter table public.whop_docs enable row level security;

-- Service role has full access
drop policy if exists "Service role can manage whop docs" on public.whop_docs;
create policy "Service role can manage whop docs"
  on public.whop_docs for all
  to service_role
  using (true) with check (true);

-- Hub members can read their own docs
drop policy if exists "Hub members can read their whop docs" on public.whop_docs;
create policy "Hub members can read their whop docs"
  on public.whop_docs for select
  using (
    hub_id = current_setting('request.jwt.claims', true)::jsonb->>'hub_id'
  );

