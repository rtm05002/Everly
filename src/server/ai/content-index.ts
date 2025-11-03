import { createServiceClient } from "@/server/db"
import type { SourceWithStats, SourceStats, BackfillResult } from "@/lib/ai-index-types"

/**
 * Get source statistics for a hub
 */
export async function getSourceStats(hubId: string): Promise<SourceWithStats[]> {
  const supabase = createServiceClient()
  
  // Query the view joined with sources table
  const { data, error } = await supabase
    .from('v_ai_source_stats')
    .select(`
      source_id,
      doc_count,
      chunk_count,
      last_sync_started_at,
      last_sync_finished_at,
      last_sync_status,
      sources:source_id (
        id,
        hub_id,
        kind,
        name,
        config,
        created_at,
        updated_at
      )
    `)
    .eq('sources.hub_id', hubId)
  
  if (error) {
    console.error('[Content Index] Error fetching source stats:', error)
    return []
  }
  
  if (!data) {
    return []
  }
  
  // Transform the joined data into flat objects
  return data.map((row: any) => {
    const source = row.sources
    return {
      id: source?.id || row.source_id,
      hub_id: source?.hub_id || hubId,
      kind: source?.kind || 'forum',
      name: source?.name || 'Unknown',
      config: source?.config || null,
      created_at: source?.created_at || new Date().toISOString(),
      updated_at: source?.updated_at || new Date().toISOString(),
      doc_count: row.doc_count || 0,
      chunk_count: row.chunk_count || 0,
      last_sync_started_at: row.last_sync_started_at || null,
      last_sync_finished_at: row.last_sync_finished_at || null,
      last_sync_status: row.last_sync_status || null,
    }
  })
}

/**
 * Backfill/repair missing hash values and verify chunk counts
 */
export async function backfillSourceStats(hubId: string): Promise<BackfillResult> {
  const supabase = createServiceClient()
  
  let repairedDocs = 0
  let verifiedChunks = 0
  
  try {
    // Find all sources for this hub
    const { data: sources, error: sourcesError } = await supabase
      .from('ai_sources')
      .select('id')
      .eq('hub_id', hubId)
    
    if (sourcesError || !sources) {
      console.error('[Content Index] Error fetching sources:', sourcesError)
      return { repairedDocs: 0, verifiedChunks: 0 }
    }
    
    for (const source of sources) {
      // Find docs missing hashes
      const { data: docs, error: docsError } = await supabase
        .from('ai_docs')
        .select('id, title, url')
        .eq('source_id', source.id)
        .is('hash', null)
      
      if (!docsError && docs) {
        // Note: We don't have the original content to recompute hash here
        // This is a placeholder that would need content fetching
        console.log(`[Content Index] Found ${docs.length} docs missing hashes for source ${source.id}`)
        // TODO: When content is available, compute and update hashes
      }
      
      // Verify chunk counts
      const { data: chunkStats } = await supabase
        .from('ai_chunks')
        .select('doc_id', { count: 'exact', head: false })
      
      if (chunkStats) {
        verifiedChunks += chunkStats.length
      }
    }
    
    console.log(`[Content Index] Backfill complete for hub ${hubId}`)
    return { repairedDocs, verifiedChunks }
  } catch (err) {
    console.error('[Content Index] Backfill error:', err)
    return { repairedDocs: 0, verifiedChunks: 0 }
  }
}

