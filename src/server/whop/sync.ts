import { createServiceClient } from "@/server/db"
import { fetchWhopProducts, fetchWhopMembers, fetchWhopSubscriptions } from "./fetchers"
import { mapWhopProducts, mapWhopMembers } from "./mappers"
import { env } from "@/lib/env"
import { embed } from "@/lib/openai"

const supabase = createServiceClient()
const BATCH_SIZE = 100

interface SyncOptions {
  full?: boolean
}

interface SyncResult {
  success: boolean
  products: number
  sources: number
  docs: number
  chunks: number
  members: number
  subscriptions: number
  error?: string
}

/**
 * Main sync orchestration for a hub
 */
export async function syncWhopForHub(hubId: string, options?: SyncOptions): Promise<SyncResult> {
  // Feature flag check
  if (env.WHOP_SYNC_ENABLED !== 'true') {
    throw new Error("Whop sync is not enabled")
  }

  // Rate limit check
  const canSync = await checkRateLimit(hubId)
  if (!canSync) {
    throw new Error("Rate limit exceeded. Please wait before syncing again.")
  }

  // Start sync job
  const jobId = await startSyncJob(hubId, "whop_full")

  try {
    console.log(`[Whop Sync] Starting sync for hub ${hubId}`)

    // Fetch all data
    const [products, members, subscriptions] = await Promise.all([
      fetchWhopProducts(hubId),
      fetchWhopMembers(hubId),
      fetchWhopSubscriptions(hubId),
    ])

    // Map products to sources/docs/chunks
    const { sources: sourcesCount, docs: docsCount } = await mapWhopProducts(hubId, products)
    
    // Map members
    const membersCount = await mapWhopMembers(hubId, members)

    // Embed any new/updated docs
    const chunksEmbedded = await embedUpdatedDocs(hubId)

    // TODO: Map subscriptions (placeholder)
    const subscriptionsCount = 0

    const result: SyncResult = {
      success: true,
      products: products.length,
      sources: sourcesCount,
      docs: docsCount,
      chunks: chunksEmbedded,
      members: membersCount,
      subscriptions: subscriptionsCount,
    }

    // Mark job as successful
    await completeSyncJob(jobId, result)

    console.log(`[Whop Sync] Completed: ${JSON.stringify(result)}`)
    return result
  } catch (err: any) {
    console.error("[Whop Sync] Error:", err)
    
    // Mark job as failed
    await failSyncJob(jobId, err.message)

    return {
      success: false,
      products: 0,
      sources: 0,
      docs: 0,
      chunks: 0,
      members: 0,
      subscriptions: 0,
      error: err.message,
    }
  }
}

/**
 * Check rate limit (1 run per hub per 5 minutes)
 */
async function checkRateLimit(hubId: string): Promise<boolean> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  
  const { data } = await supabase
    .from("ai_sync_runs")
    .select("id")
    .eq("source_id", hubId) // Using hub_id as source_id for now
    .eq("status", "running")
    .gte("started_at", fiveMinutesAgo)
    .limit(1)
  
  return !data || data.length === 0
}

/**
 * Start a sync job
 */
async function startSyncJob(hubId: string, source: string): Promise<string> {
  const { data, error } = await supabase
    .from("ai_sync_runs")
    .insert({
      source_id: hubId, // Temporary: using hub_id as source_id
      status: "running",
      stats: {},
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error("Failed to start sync job")
  }

  return data.id
}

/**
 * Complete sync job
 */
async function completeSyncJob(jobId: string, result: SyncResult): Promise<void> {
  await supabase
    .from("ai_sync_runs")
    .update({
      status: "completed",
      stats: result,
      finished_at: new Date().toISOString(),
    })
    .eq("id", jobId)
}

/**
 * Fail sync job
 */
async function failSyncJob(jobId: string, error: string): Promise<void> {
  await supabase
    .from("ai_sync_runs")
    .update({
      status: "failed",
      stats: { error },
      finished_at: new Date().toISOString(),
    })
    .eq("id", jobId)
}

/**
 * Embed any docs that don't have embeddings yet
 */
async function embedUpdatedDocs(hubId: string): Promise<number> {
  try {
    // Get all source IDs for this hub
    const { data: sources } = await supabase
      .from("ai_sources")
      .select("id")
      .eq("hub_id", hubId)

    if (!sources || sources.length === 0) {
      return 0
    }

    const sourceIds = sources.map(s => s.id)

    // Get all doc IDs for these sources
    const { data: docs } = await supabase
      .from("ai_docs")
      .select("id")
      .in("source_id", sourceIds)

    if (!docs || docs.length === 0) {
      return 0
    }

    const docIds = docs.map(d => d.id)

    // Get all chunks without embeddings for these docs
    const { data: chunks } = await supabase
      .from("ai_chunks")
      .select("id, content")
      .is("embedding", null)
      .in("doc_id", docIds)
      .limit(100) // Limit to 100 at a time

    if (!chunks || chunks.length === 0) {
      return 0
    }

    // Generate embeddings
    const texts = chunks.map(c => c.content)
    const embeddings = await embed(texts)

    // Update in batches
    let updated = 0
    for (let i = 0; i < chunks.length; i++) {
      const { error: updateError } = await supabase
        .from("ai_chunks")
        .update({ embedding: embeddings[i] })
        .eq("id", chunks[i].id)

      if (!updateError) {
        updated++
      }
    }

    return updated
  } catch (err) {
    console.error("[Whop Sync] Error embedding docs:", err)
    return 0
  }
}

