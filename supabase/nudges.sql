-- ========== NUDGE SYSTEM ==========
-- Phase 1: Schema & RLS for AI Nudges feature

-- ========== NUDGE RECIPES ==========
create table if not exists public.nudge_recipes (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid not null references public.hubs(id) on delete cascade,
  name text not null,
  trigger jsonb not null,
  targeting jsonb not null default '{}'::jsonb,
  message_template text not null,
  channel text not null default 'dm',
  frequency jsonb not null default '{"cooldown_days":7,"max_per_week":2}',
  dnd jsonb not null default '{"start":"22:00","end":"07:00"}',
  enabled boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists nudge_recipes_hub_idx on public.nudge_recipes (hub_id);
create index if not exists nudge_recipes_trigger_idx on public.nudge_recipes using gin (trigger);
create index if not exists nudge_recipes_target_idx on public.nudge_recipes using gin (targeting);

-- ========== NUDGE RUNS ==========
create table if not exists public.nudge_runs (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid not null references public.hubs(id) on delete cascade,
  recipe_id uuid not null references public.nudge_recipes(id) on delete cascade,
  initiated_by text not null default 'system',
  status text not null default 'running',
  targeted_count int default 0,
  sent_count int default 0,
  error_count int default 0,
  started_at timestamptz default now(),
  finished_at timestamptz
);

create index if not exists nudge_runs_hub_time_idx on public.nudge_runs (hub_id, started_at desc);

-- ========== NUDGE MESSAGES ==========
create table if not exists public.nudge_messages (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid not null references public.hubs(id) on delete cascade,
  recipe_id uuid not null references public.nudge_recipes(id) on delete cascade,
  run_id uuid references public.nudge_runs(id) on delete set null,
  member_id uuid not null references public.members(id) on delete cascade,
  dedupe_key text not null,
  channel text not null,
  rendered_message text not null,
  status text not null default 'queued',
  error text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  sent_at timestamptz
);

create index if not exists nudge_messages_member_idx on public.nudge_messages (hub_id, member_id, created_at desc);
create index if not exists nudge_messages_recipe_time_idx on public.nudge_messages (recipe_id, created_at desc);
create unique index if not exists nudge_messages_dedupe_idx on public.nudge_messages (hub_id, dedupe_key);

-- ========== MEMBER PREFERENCES ==========
create table if not exists public.member_preferences (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid not null references public.hubs(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  channel_prefs jsonb not null default '{"dm": true, "email": false}'::jsonb,
  muted_until timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (hub_id, member_id)
);

create index if not exists member_prefs_idx on public.member_preferences (hub_id, member_id);

-- ========== ROW LEVEL SECURITY ==========
alter table public.nudge_recipes enable row level security;
alter table public.nudge_runs enable row level security;
alter table public.nudge_messages enable row level security;
alter table public.member_preferences enable row level security;

-- ========== NUDGE RECIPES POLICIES ==========
-- Creators can do everything in their hub
drop policy if exists nudge_recipes_creator_all on public.nudge_recipes;
create policy nudge_recipes_creator_all on public.nudge_recipes
  for all using (
    auth_claim('role') = 'creator' and hub_id::text = auth_claim('hub_id')
  ) with check (
    auth_claim('role') = 'creator' and hub_id::text = auth_claim('hub_id')
  );

-- Members can read recipes (to see what nudges they might receive)
drop policy if exists nudge_recipes_member_read on public.nudge_recipes;
create policy nudge_recipes_member_read on public.nudge_recipes
  for select using (
    auth_claim('role') = 'member'
    and hub_id::text = auth_claim('hub_id')
    and enabled = true
  );

-- ========== NUDGE RUNS POLICIES ==========
-- Creators can do everything in their hub
drop policy if exists nudge_runs_creator_all on public.nudge_runs;
create policy nudge_runs_creator_all on public.nudge_runs
  for all using (
    auth_claim('role') = 'creator' and hub_id::text = auth_claim('hub_id')
  ) with check (
    auth_claim('role') = 'creator' and hub_id::text = auth_claim('hub_id')
  );

-- Members can read runs (to see when nudges were sent)
drop policy if exists nudge_runs_member_read on public.nudge_runs;
create policy nudge_runs_member_read on public.nudge_runs
  for select using (
    auth_claim('role') = 'member'
    and hub_id::text = auth_claim('hub_id')
  );

-- ========== NUDGE MESSAGES POLICIES ==========
-- Creators can do everything in their hub
drop policy if exists nudge_messages_creator_all on public.nudge_messages;
create policy nudge_messages_creator_all on public.nudge_messages
  for all using (
    auth_claim('role') = 'creator' and hub_id::text = auth_claim('hub_id')
  ) with check (
    auth_claim('role') = 'creator' and hub_id::text = auth_claim('hub_id')
  );

-- Members can only read their own messages
drop policy if exists nudge_messages_member_read_self on public.nudge_messages;
create policy nudge_messages_member_read_self on public.nudge_messages
  for select using (
    auth_claim('role') = 'member'
    and hub_id::text = auth_claim('hub_id')
    and member_id::text = auth_claim('member_id')
  );

-- ========== MEMBER PREFERENCES POLICIES ==========
-- Members can read and write their own preferences
drop policy if exists member_preferences_self on public.member_preferences;
create policy member_preferences_self on public.member_preferences
  for all using (
    auth_claim('role') = 'member'
    and hub_id::text = auth_claim('hub_id')
    and member_id::text = auth_claim('member_id')
  ) with check (
    auth_claim('role') = 'member'
    and hub_id::text = auth_claim('hub_id')
    and member_id::text = auth_claim('member_id')
  );

-- Creators can read all preferences (for analytics)
drop policy if exists member_preferences_creator_read on public.member_preferences;
create policy member_preferences_creator_read on public.member_preferences
  for select using (
    auth_claim('role') = 'creator' and hub_id::text = auth_claim('hub_id')
  );
