-- Add locked_until column to ai_sources for concurrency control
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ai_sources'
      and column_name = 'locked_until'
  ) then
    alter table public.ai_sources
    add column locked_until timestamptz;
  end if;
end$$;


