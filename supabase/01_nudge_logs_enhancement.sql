-- Enhance nudge_logs table with additional fields for admin UI
-- Add new columns if they don't exist

alter table public.nudge_logs add column if not exists recipe_id text;
alter table public.nudge_logs add column if not exists member_name text;
alter table public.nudge_logs add column if not exists message_preview text;

-- Rename attempt to attempts for consistency (only if column exists and isn't already renamed)
-- Note: PostgreSQL doesn't support IF EXISTS for RENAME COLUMN, so this will error if column is already renamed
-- alter table public.nudge_logs rename column attempt to attempts;
-- Skipping for now to avoid errors - will handle manually if needed

-- Update channel check constraint to match expected values
alter table public.nudge_logs drop constraint if exists nudge_logs_channel_check;
alter table public.nudge_logs add constraint nudge_logs_channel_check 
  check (channel in ('email','dm','announcement','push','webhook','stub'));

-- Drop old indexes and recreate with proper names
drop index if exists public.idx_nudge_logs_hub_created;
drop index if exists public.idx_nudge_logs_status;
drop index if exists public.idx_nudge_logs_channel;
drop index if exists public.idx_nudge_logs_recipe;
drop index if exists public.nudge_logs_member_idx;
drop index if exists public.nudge_logs_status_idx;

-- Create better indexes for admin UI
create index if not exists idx_nudge_logs_hub_created on public.nudge_logs(hub_id, created_at desc);
create index if not exists idx_nudge_logs_status on public.nudge_logs(status);
create index if not exists idx_nudge_logs_channel on public.nudge_logs(channel);
create index if not exists idx_nudge_logs_recipe on public.nudge_logs(recipe_id);
create index if not exists idx_nudge_logs_recipe_name on public.nudge_logs(recipe_name);

-- Drop scheduled_at column if it exists (not needed for display)
-- Keep it for now to avoid breaking existing code

