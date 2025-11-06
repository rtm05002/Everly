/**
 * Shared types for AI Content Index system
 */

export type SourceKind = 'whop_product' | 'whop_forum' | 'whop_doc' | 'url' | 'forum' | 'doc' | 'announcement' | 'faq' | string

export interface UrlSourceSettings {
  start_urls: string[]
  allow_patterns?: string[]
  deny_patterns?: string[]
  follow_sitemaps?: boolean
  max_pages?: number
}

export interface SourceRow {
  id: string
  hub_id: string
  kind: SourceKind
  name: string
  config: Record<string, any> | null
  settings?: Record<string, any> | null
  last_synced_at?: string | null
  doc_count?: number
  chunk_count?: number
  created_at: string
  updated_at: string
}

export interface SourceStats {
  source_id: string
  doc_count: number
  chunk_count: number
  last_sync_started_at: string | null
  last_sync_finished_at: string | null
  last_sync_status: string | null
}

export interface SourceWithStats extends SourceRow {
  doc_count: number
  chunk_count: number
  last_sync_started_at: string | null
  last_sync_finished_at: string | null
  last_sync_status: string | null
}

export interface DocRow {
  id: string
  source_id: string
  external_id: string
  title: string | null
  url: string | null
  hash: string | null
  content_hash?: string | null
  created_at: string
  updated_at: string
}

export interface ChunkRow {
  id: string
  doc_id: string
  idx: number
  content: string
  embedding: number[] | null
  token_count: number | null
  needs_embedding?: boolean
  created_at: string
}

export interface SyncRunRow {
  id: string
  source_id: string
  status: 'running' | 'completed' | 'failed'
  stats: Record<string, any> | null
  started_at: string
  finished_at: string | null
}

export interface BackfillResult {
  repairedDocs: number
  verifiedChunks: number
}

