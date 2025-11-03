-- System metrics table for monitoring
-- Stores key-value pairs for tracking system events like last webhook, backfill, sync

create table if not exists public.system_metrics (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Index for faster lookups (though primary key already provides this)
create index if not exists system_metrics_updated_at_idx on public.system_metrics (updated_at desc);

-- RLS: Allow service role full access, no public access
alter table public.system_metrics enable row level security;

-- Service role bypass (default behavior)
-- No policies needed - only server-side code with service role will access this

