alter table ai_sources add column if not exists locked_until timestamptz;

