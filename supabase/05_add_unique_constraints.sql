-- Add unique constraints to ai_docs and ai_chunks for idempotent upserts
-- Run this if you already have ai_docs/ai_chunks tables

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

