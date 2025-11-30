/**
 * Backfill embeddings for ai_chunks that have needs_embedding = true
 * 
 * Usage: pnpm tsx scripts/backfill-embeddings.ts
 */

// Load environment variables from .env.local before importing modules
import { config } from "dotenv"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, "..", ".env.local")
config({ path: envPath })

async function main() {
  // Dynamic imports after env vars are loaded
  const { embed } = await import("@/lib/openai")
  const { createServiceClient } = await import("@/server/db")
  console.log("Starting embedding backfill...")
  
  // Use existing server-side Supabase client (service role)
  const db = createServiceClient()
  
  if (!db) {
    throw new Error("Missing Supabase client. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE are set.")
  }

  let totalProcessed = 0
  let batchCount = 0

  while (true) {
    // Fetch batch of chunks needing embeddings (limit 200 for rate limiting)
    const { data: rows, error } = await db
      .from("ai_chunks")
      .select("id, content")
      .eq("needs_embedding", true)
      .limit(200)

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    if (!rows || rows.length === 0) {
      console.log("No more chunks to process.")
      break
    }

    batchCount++
    console.log(`Processing batch ${batchCount}: ${rows.length} chunks`)

    // Generate embeddings in batch for efficiency
    const texts = rows.map((r) => r.content)
    const embeddings = await embed(texts)

    if (!embeddings || embeddings.length !== rows.length) {
      throw new Error(
        `Embedding count mismatch: expected ${rows.length}, got ${embeddings?.length || 0}`
      )
    }

    // Update each chunk with its embedding
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const embedding = embeddings[i]

      const { error: upErr } = await db
        .from("ai_chunks")
        .update({
          embedding: embedding,
          needs_embedding: false,
        })
        .eq("id", row.id)

      if (upErr) {
        console.error(`Error updating chunk ${row.id}:`, upErr.message)
        // Continue with other chunks even if one fails
      } else {
        totalProcessed++
      }
    }

    console.log(`Batch ${batchCount} complete. Total processed: ${totalProcessed}`)

    // Small delay between batches to respect rate limits
    if (rows.length === 200) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  console.log(`Backfill complete. Total chunks processed: ${totalProcessed}`)
}

main().catch((e) => {
  console.error("Fatal error:", e)
  process.exit(1)
})



