export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/server/db"
import { embed } from "@/lib/openai"
import crypto from "crypto"

// TODO: Replace with real Whop fetchers once available
async function fetchWhopContent(hubId: string) {
  // Stub: return unified items for forums, docs, announcements, etc.
  // Expected format: {source, external_id, title, url, content}
  return [] as {
    source: string
    external_id: string
    title?: string
    url?: string
    content: string
  }[]
}

/**
 * Chunk text into approximate size chunks (target ~800-1200 tokens)
 * 1 token ≈ 4 characters, so 3000 chars ≈ 750 tokens
 */
function chunkText(text: string, approxChars = 3000): string[] {
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += approxChars) {
    chunks.push(text.slice(i, i + approxChars))
  }
  return chunks
}

/**
 * Generate deterministic hash for idempotent upserts
 */
function hashContent(s: string): string {
  return crypto.createHash("sha1").update(s).digest("hex")
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const hub_id = body.hub_id as string
    
    if (!hub_id) {
      return NextResponse.json({ error: "hub_id required" }, { status: 400 })
    }

    const supabase = createServiceClient()
    
    // Fetch content from Whop
    const items = await fetchWhopContent(hub_id)
    
    if (items.length === 0) {
      return NextResponse.json({ 
        indexed: 0,
        message: "No content to index" 
      })
    }

    // Normalize and chunk content
    const rows = items.flatMap((it) => {
      const chunks = chunkText(it.content)
      return chunks.map((c, idx) => {
        const doc_hash = hashContent([it.title ?? "", c].join("|"))
        return {
          hub_id,
          source: it.source,
          external_id: it.external_id,
          title: it.title ?? null,
          url: it.url ?? null,
          content: c,
          chunk_index: idx,
          doc_hash,
        }
      })
    })

    // Upsert content (without embedding yet)
    const { data: upserted, error: upsertError } = await supabase
      .from("whop_docs")
      .upsert(rows, { onConflict: "hub_id,external_id,chunk_index" })
      .select("id, doc_hash, content")
    
    if (upsertError) {
      console.error("[Whop Sync] Upsert error:", upsertError)
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    if (!upserted || upserted.length === 0) {
      return NextResponse.json({ 
        indexed: 0,
        message: "No new content to embed" 
      })
    }

    // Generate embeddings for all upserted chunks
    const texts = upserted.map((r) => r.content)
    console.log(`[Whop Sync] Generating embeddings for ${texts.length} chunks...`)
    
    const vectors = await embed(texts)
    
    // Bulk update embeddings
    console.log(`[Whop Sync] Updating embeddings...`)
    const updates = upserted.map((r, i) => ({ id: r.id, embedding: vectors[i] }))
    
    // Update embeddings one-by-one (Supabase doesn't support bulk update with arrays directly)
    for (const u of updates) {
      const { error } = await supabase
        .from("whop_docs")
        .update({ embedding: u.embedding })
        .eq("id", u.id)
      
      if (error) {
        console.error("[Whop Sync] Embedding update error:", error)
      }
    }

    return NextResponse.json({ 
      indexed: updates.length,
      message: `Successfully indexed ${updates.length} chunks` 
    })
  } catch (err: any) {
    console.error("[Whop Sync] Exception:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

