-- AI Content Index Tables and Views
-- Idempotent: creates only if missing

-- ai_sources: Source definitions (Whop forums, docs, etc.)
create table if not exists public.ai_sources (
  id uuid primary key default gen_random_uuid(),
  hub_id text not null,
  kind text not null,              -- 'forum' | 'doc' | 'announcement' | 'faq'
  name text not null,
  config jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ai_docs: Individual documents
create table if not exists public.ai_docs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.ai_sources(id) on delete cascade,
  external_id text not null,
  title text,
  url text,
  hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ai_chunks: Text chunks with embeddings
create table if not exists public.ai_chunks (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid references public.ai_docs(id) on delete cascade,
  idx int not null,
  content text not null,
  embedding vector(1536),
  token_count int,
  created_at timestamptz not null default now()
);

-- ai_sync_runs: Sync job history
create table if not exists public.ai_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.ai_sources(id) on delete cascade,
  status text not null,             -- 'running' | 'completed' | 'failed'
  stats jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

-- Indexes
create index if not exists idx_ai_docs_source_external on public.ai_docs(source_id, external_id);
create index if not exists idx_ai_chunks_doc_idx on public.ai_chunks(doc_id, idx);
create index if not exists idx_ai_chunks_embedding on public.ai_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- View: Source statistics
create or replace view public.v_ai_source_stats as
select 
  s.id as source_id,
  count(distinct d.id) as doc_count,
  count(distinct c.id) as chunk_count,
  max(r.started_at) as last_sync_started_at,
  max(r.finished_at) as last_sync_finished_at,
  (select status from public.ai_sync_runs where source_id = s.id order by started_at desc limit 1) as last_sync_status
from public.ai_sources s
left join public.ai_docs d on d.source_id = s.id
left join public.ai_chunks c on c.doc_id = d.id
left join public.ai_sync_runs r on r.source_id = s.id
group by s.id;

-- RLS Policies
alter table public.ai_sources enable row level security;
alter table public.ai_docs enable row level security;
alter table public.ai_chunks enable row level security;
alter table public.ai_sync_runs enable row level security;

-- Service role has full access
drop policy if exists "Service role can manage ai sources" on public.ai_sources;
create policy "Service role can manage ai sources"
  on public.ai_sources for all
  to service_role
  using (true) with check (true);

drop policy if exists "Service role can manage ai docs" on public.ai_docs;
create policy "Service role can manage ai docs"
  on public.ai_docs for all
  to service_role
  using (true) with check (true);

drop policy if exists "Service role can manage ai chunks" on public.ai_chunks;
create policy "Service role can manage ai chunks"
  on public.ai_chunks for all
  to service_role
  using (true) with check (true);

drop policy if exists "Service role can manage ai sync runs" on public.ai_sync_runs;
create policy "Service role can manage ai sync runs"
  on public.ai_sync_runs for all
  to service_role
  using (true) with check (true);

-- Hub members can read their own data
drop policy if exists "Hub members can read their ai sources" on public.ai_sources;
create policy "Hub members can read their ai sources"
  on public.ai_sources for select
  using (
    hub_id = current_setting('request.jwt.claims', true)::jsonb->>'hub_id'
  );

drop policy if exists "Hub members can read their ai docs" on public.ai_docs;
create policy "Hub members can read their ai docs"
  on public.ai_docs for select
  using (
    source_id in (select id from public.ai_sources where hub_id = current_setting('request.jwt.claims', true)::jsonb->>'hub_id')
  );

drop policy if exists "Hub members can read their ai chunks" on public.ai_chunks;
create policy "Hub members can read their ai chunks"
  on public.ai_chunks for select
  using (
    doc_id in (
      select d.id from public.ai_docs d
      join public.ai_sources s on s.id = d.source_id
      where s.hub_id = current_setting('request.jwt.claims', true)::jsonb->>'hub_id'
    )
  );

drop policy if exists "Hub members can read their ai sync runs" on public.ai_sync_runs;
create policy "Hub members can read their ai sync runs"
  on public.ai_sync_runs for select
  using (
    source_id in (select id from public.ai_sources where hub_id = current_setting('request.jwt.claims', true)::jsonb->>'hub_id')
  );

