create table if not exists app_logs (
  id bigserial primary key,
  level text not null check (level in ('info','warn','error')),
  event text not null,
  hub_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

