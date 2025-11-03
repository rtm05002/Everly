# Apply Unique Constraints to Existing Database

If you already have the `ai_docs` and `ai_chunks` tables from a previous migration, run this to add the unique constraints:

## Option 1: Using Supabase SQL Editor

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Copy and paste this SQL:

```sql
-- Add unique constraint to ai_docs
alter table public.ai_docs 
  add constraint ai_docs_source_external_unique 
  unique (source_id, external_id);

-- Add unique constraint to ai_chunks  
alter table public.ai_chunks 
  add constraint ai_chunks_doc_idx_unique 
  unique (doc_id, idx);

-- These constraints also create indexes, so we can drop the redundant ones
drop index if exists public.idx_ai_docs_source_external;
drop index if exists public.idx_ai_chunks_doc_idx;
```

4. Click **Run**

## Option 2: Using Supabase CLI

```bash
supabase db execute -f supabase/05_add_unique_constraints.sql
```

## Why This Is Needed

The upsert logic in `src/server/whop/mappers.ts` uses:
- `onConflict: "source_id,external_id"` for docs
- `onConflict: "doc_id,idx"` for chunks

These require unique constraints (or primary keys) on those column combinations to work properly.

Without unique constraints, upserts won't return the existing row on conflict, causing the mapper to think no data was inserted.

## Verify It Worked

After running the migration, test the sync again:

```bash
curl -X POST http://localhost:3000/api/debug/test-sync
```

You should see `docs: 2` in the response!

