import { embed } from "@/lib/openai"
import { createServiceClient } from "@/server/db"

export interface SearchResult {
  chunk_id: string
  doc_id: string
  text: string
  score: number
  source_kind: string
  url?: string
  title?: string
}

/**
 * Semantic search using pgvector KNN
 * Generates embedding for query and searches for top-k similar chunks
 */
export async function semanticSearch({
  hubId,
  query,
  k = 12,
}: {
  hubId: string
  query: string
  k?: number
}): Promise<SearchResult[]> {
  // Generate embedding for the query
  // embed() takes an array and returns an array of embeddings
  const embeddings = await embed([query])
  if (!embeddings || embeddings.length === 0) {
    throw new Error("Failed to generate embedding for query")
  }
  const qVec = embeddings[0]

  const supabase = createServiceClient()

  // Call RPC function for semantic search
  const { data, error } = await supabase.rpc("ai_knn_search", {
    p_hub_id: hubId,
    p_query_vec: qVec,
    p_k: k,
  })

  if (error) {
    throw new Error(`RPC error: ${error.message}`)
  }

  return (data || []) as SearchResult[]
}



