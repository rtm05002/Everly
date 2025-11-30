import { createServiceClient } from "@/server/db"
import { chunkText } from "@/lib/url-indexer"
import { embedBatch } from "@/lib/embed"
import crypto from "crypto"

/**
 * Hash function for content deduplication
 */
function hashContent(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex")
}

export interface UpsertDocInput {
  hubId: string
  sourceKind: string
  externalId: string
  title: string
  url?: string
  text: string
}

export interface UpsertDocResult {
  status: "added" | "updated" | "skipped"
  docId?: string
}

/**
 * Upsert a document and its chunks into the RAG pipeline
 * Follows the pattern from url-sync route for consistency
 */
export async function upsertDocAndChunks(
  input: UpsertDocInput
): Promise<UpsertDocResult> {
  const { hubId, sourceKind, externalId, title, url, text } = input

  if (!text || text.length < 50) {
    return { status: "skipped" }
  }

  const supabase = createServiceClient()

  // First, find or create the source
  const { data: source, error: sourceError } = await supabase
    .from("ai_sources")
    .select("id")
    .eq("hub_id", hubId)
    .eq("kind", sourceKind)
    .maybeSingle()

  let sourceId: string

  if (source) {
    sourceId = source.id
  } else {
    // Create new source
    const { data: newSource, error: newSourceError } = await supabase
      .from("ai_sources")
      .insert({
        hub_id: hubId,
        kind: sourceKind,
        name: `${sourceKind} source`,
      })
      .select("id")
      .single()

    if (newSourceError || !newSource) {
      throw new Error(`Failed to create source: ${newSourceError?.message}`)
    }

    sourceId = newSource.id
  }

  // Compute content hash for deduplication
  const contentHash = hashContent(text)

  // Check if doc exists with same hash
  const { data: existingDoc } = await supabase
    .from("ai_docs")
    .select("id, hash")
    .eq("source_id", sourceId)
    .eq("external_id", externalId)
    .maybeSingle()

  if (existingDoc && existingDoc.hash === contentHash) {
    return { status: "skipped", docId: existingDoc.id }
  }

  // Upsert document
  const { data: docRow, error: docErr } = await supabase
    .from("ai_docs")
    .upsert(
      {
        source_id: sourceId,
        external_id: externalId,
        title: title || externalId,
        url: url || null,
        hash: contentHash,
      },
      { onConflict: "source_id,external_id" }
    )
    .select("id")
    .single()

  if (docErr || !docRow) {
    throw new Error(`Failed to upsert doc: ${docErr?.message}`)
  }

  const docId = docRow.id

  // Chunk the text
  const chunks = chunkText(text, 1200, 100)

  // Generate embeddings (if available)
  const embeddings = await embedBatch(chunks).catch(() => null)

  // Insert chunks
  const chunkRows = chunks.map((content, i) => ({
    doc_id: docId,
    idx: i,
    content,
    embedding: embeddings ? embeddings[i] : null,
    needs_embedding: embeddings ? false : true,
    token_count: Math.ceil(content.length / 4), // Rough estimate
  }))

  // Insert in batches
  for (let i = 0; i < chunkRows.length; i += 50) {
    const batch = chunkRows.slice(i, i + 50)
    const { error: chunkErr } = await supabase
      .from("ai_chunks")
      .upsert(batch, { onConflict: "doc_id,idx" })
    if (chunkErr) {
      console.error("[RAG Ingest] Error inserting chunks:", chunkErr)
      // Continue with other chunks even if one batch fails
    }
  }

  return {
    status: existingDoc ? "updated" : "added",
    docId,
  }
}

