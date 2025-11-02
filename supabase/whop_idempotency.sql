-- Add nullable event id columns if missing
alter table public.activity_logs add column if not exists whop_event_id text;
alter table public.bounty_events add column if not exists whop_event_id text;

-- Unique per hub to avoid duplicates on retries
create unique index if not exists activity_logs_hub_event_idx
  on public.activity_logs (hub_id, whop_event_id) where whop_event_id is not null;

create unique index if not exists bounty_events_hub_event_idx
  on public.bounty_events (hub_id, whop_event_id) where whop_event_id is not null;

