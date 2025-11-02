create table if not exists public.onboarding_flows (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid not null references public.hubs(id) on delete cascade,
  name text not null,
  description text,
  audience jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  enabled boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists onboarding_flows_hub_idx on public.onboarding_flows (hub_id);

create table if not exists public.onboarding_steps (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid not null references public.hubs(id) on delete cascade,
  flow_id uuid not null references public.onboarding_flows(id) on delete cascade,
  order_index int not null,
  title text not null,
  kind text not null,
  config jsonb not null default '{}'::jsonb,
  reward jsonb,
  nudge_recipe_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists onboarding_steps_flow_idx on public.onboarding_steps (flow_id);

create table if not exists public.onboarding_progress (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid not null references public.hubs(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  flow_id uuid not null references public.onboarding_flows(id) on delete cascade,
  step_id uuid not null references public.onboarding_steps(id) on delete cascade,
  status text not null default 'pending',
  meta jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz default now(),
  unique (hub_id, member_id, step_id)
);
create index if not exists onboarding_progress_member_idx on public.onboarding_progress (hub_id, member_id);

-- RLS enablement (use your existing jwt_text/jwt_uuid helpers)
alter table public.onboarding_flows enable row level security;
alter table public.onboarding_steps enable row level security;
alter table public.onboarding_progress enable row level security;

-- read flows/steps for hub; creators can write
create policy "flows_select" on public.onboarding_flows for select using (hub_id = jwt_uuid('hub_id'));
create policy "flows_write"  on public.onboarding_flows for all using (jwt_text('role') in ('creator','moderator') and hub_id = jwt_uuid('hub_id')) with check (hub_id = jwt_uuid('hub_id'));

create policy "steps_select" on public.onboarding_steps for select using (hub_id = jwt_uuid('hub_id'));
create policy "steps_write"  on public.onboarding_steps for all using (jwt_text('role') in ('creator','moderator') and hub_id = jwt_uuid('hub_id')) with check (hub_id = jwt_uuid('hub_id'));

-- members can read their own progress and update it; creators read all
create policy "progress_select_member" on public.onboarding_progress for select using (hub_id = jwt_uuid('hub_id') and (jwt_text('role')='member' or jwt_text('role') in ('creator','moderator')));
create policy "progress_update_member" on public.onboarding_progress for update using (hub_id = jwt_uuid('hub_id') and jwt_text('role')='member') with check (hub_id = jwt_uuid('hub_id') and jwt_text('role')='member');
create policy "progress_insert_member" on public.onboarding_progress for insert with check (hub_id = jwt_uuid('hub_id') and jwt_text('role') in ('member','creator','moderator'));

