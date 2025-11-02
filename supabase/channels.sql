-- Channels table for onboarding step configuration
create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid not null references public.hubs(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (hub_id, slug)
);

create index if not exists channels_hub_idx on public.channels (hub_id);

-- RLS
alter table public.channels enable row level security;

create policy "channels_select" on public.channels for select using (hub_id = jwt_uuid('hub_id'));
create policy "channels_write" on public.channels for all using (jwt_text('role') in ('creator','moderator') and hub_id = jwt_uuid('hub_id')) with check (hub_id = jwt_uuid('hub_id'));

