import { createServiceClient } from "@/server/db"
import type { SourceWithStats, SourceStats, BackfillResult } from "@/lib/ai-index-types"

/**
 * Get source statistics for a hub
 */
export async function getSourceStats(hubId: string): Promise<SourceWithStats[]> {
  const supabase = createServiceClient()
  
  // First, get all sources for this hub
  const { data: sources, error: sourcesError } = await supabase
    .from('ai_sources')
    .select('*')
    .eq('hub_id', hubId)
  
  if (sourcesError || !sources) {
    console.error('[Content Index] Error fetching sources:', sourcesError)
    return []
  }
  
  // Then get stats for each source
  const result: SourceWithStats[] = []
  
  for (const source of sources) {
    // Get stats from view
    const { data: stats } = await supabase
      .from('v_ai_source_stats')
      .select('*')
      .eq('source_id', source.id)
      .single()
    
    result.push({
      id: source.id,
      hub_id: source.hub_id,
      kind: source.kind as any,
      name: source.name,
      config: source.config,
      created_at: source.created_at,
      updated_at: source.updated_at,
      doc_count: stats?.doc_count || 0,
      chunk_count: stats?.chunk_count || 0,
      last_sync_started_at: stats?.last_sync_started_at || null,
      last_sync_finished_at: stats?.last_sync_finished_at || null,
      last_sync_status: stats?.last_sync_status || null,
    })
  }
  
  return result
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
      
      // Verify chunk counts (only for this source's docs)
      const { count: chunkCount, error: chunkError } = await supabase
        .from('ai_chunks')
        .select('*', { count: 'exact', head: true })
        .in('doc_id', 
          // Get doc IDs for this source first
          supabase.from('ai_docs').select('id').eq('source_id', source.id)
        )
      
      if (!chunkError && chunkCount !== null) {
        verifiedChunks += chunkCount
      }
    }
    
    console.log(`[Content Index] Backfill complete for hub ${hubId}`)
    return { repairedDocs, verifiedChunks }
  } catch (err) {
    console.error('[Content Index] Backfill error:', err)
    return { repairedDocs: 0, verifiedChunks: 0 }
  }
}

