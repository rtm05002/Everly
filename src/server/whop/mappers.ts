import { createServiceClient } from "@/server/db"
import crypto from "crypto"

/**
 * Hash function for idempotent upserts
 */
function hashContent(s: string): string {
  return crypto.createHash("sha1").update(s).digest("hex")
}

/**
 * Map Whop products to ai_sources and ai_docs
 */
export async function mapWhopProducts(hubId: string, products: any[]): Promise<{ sources: number; docs: number }> {
  const supabase = createServiceClient()
  let sourcesCount = 0
  let docsCount = 0

  for (const product of products) {
    if (!product?.id) continue

    // Check if source exists
    const { data: existing } = await supabase
      .from("ai_sources")
      .select("id")
      .eq("hub_id", hubId)
      .eq("kind", "whop_product")
      .eq("config->>whop_product_id", product.id)
      .single()

    let sourceId: string
    
    if (existing) {
      sourceId = existing.id
    } else {
      // Insert new source
      const { data: newSource, error: sourceError } = await supabase
        .from("ai_sources")
        .insert({
          hub_id: hubId,
          kind: "whop_product",
          name: product.name || `Whop Product ${product.id}`,
          config: { whop_product_id: product.id },
        })
        .select()
        .single()

      if (sourceError || !newSource) {
        console.error("[Whop Mapper] Error inserting source:", sourceError)
        continue
      }
      
      sourceId = newSource.id
    }

    sourcesCount++

    // Map product as a doc
    const docHash = hashContent([product.name, product.description || ""].join("|"))
    
    const { data: doc, error: docError } = await supabase
      .from("ai_docs")
      .upsert({
        source_id: sourceId,
        external_id: product.id,
        title: product.name,
        url: product.url || null,
        hash: docHash,
      }, {
        onConflict: "source_id,external_id",
      })
      .select()
      .single()

    if (docError) {
      console.error("[Whop Mapper] Error upserting doc:", docError)
      continue
    }

    docsCount++

    // Chunk product description if it exists
    if (product.description) {
      const chunks = chunkText(product.description)
      
      for (let i = 0; i < chunks.length; i++) {
        await supabase
          .from("ai_chunks")
          .upsert({
            doc_id: doc.id,
            idx: i,
            content: chunks[i],
            token_count: Math.ceil(chunks[i].length / 4), // Rough estimate
          }, {
            onConflict: "doc_id,idx",
          })
      }
    }
  }

  return { sources: sourcesCount, docs: docsCount }
}

/**
 * Map Whop members to members table
 */
export async function mapWhopMembers(hubId: string, members: any[]): Promise<number> {
  const supabase = createServiceClient()
  let count = 0

  for (const member of members) {
    if (!member?.id) continue

    const { error } = await supabase
      .from("members")
      .upsert({
        hub_id: hubId,
        whop_member_id: member.id,
        display_name: member.user?.username || member.user?.email || "Unknown",
        email: member.user?.email || null,
        role: member.tier?.name?.toLowerCase() || "member",
        joined_at: member.created_at || new Date().toISOString(),
        last_active_at: member.last_active_at || member.updated_at || new Date().toISOString(),
      }, {
        onConflict: "hub_id,whop_member_id",
      })

    if (error) {
      console.error("[Whop Mapper] Error upserting member:", error)
    } else {
      count++
    }
  }

  return count
}

/**
 * Chunk text helper
 */
function chunkText(text: string, approxChars = 3000): string[] {
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += approxChars) {
    chunks.push(text.slice(i, i + approxChars))
  }
  return chunks
}

