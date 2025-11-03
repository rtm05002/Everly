-- Nudge delivery system tables
-- Supports idempotency, rate limiting, and retries

create table if not exists public.nudge_logs (
  id uuid primary key default gen_random_uuid(),
  hub_id text not null,
  member_id text not null,
  recipe_name text not null,
  channel text not null default 'stub',
  message text not null,
  message_hash text not null,
  status text not null check (status in ('queued','sent','failed','skipped')),
  error text,
  attempt int not null default 0,
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add unique constraint for idempotency (same day check)
create unique index if not exists nudge_logs_unique_idx 
  on public.nudge_logs (hub_id, member_id, recipe_name, message_hash, date_trunc('day', scheduled_at));

create table if not exists public.nudge_queue (
  id uuid primary key default gen_random_uuid(),
  hub_id text not null,
  member_id text not null,
  recipe_name text not null,
  payload jsonb not null,
  attempt int not null default 0,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists nudge_queue_available_idx on public.nudge_queue (available_at) where locked_at is null;
create index if not exists nudge_logs_member_idx on public.nudge_logs (hub_id, member_id, scheduled_at desc);
create index if not exists nudge_logs_status_idx on public.nudge_logs (status, created_at desc);

-- RLS policies (server-only access for now)
alter table public.nudge_logs enable row level security;
alter table public.nudge_queue enable row level security;

-- No RLS policies needed - only service role will access these tables

