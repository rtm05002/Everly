export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/server/db"
import { embed } from "@/lib/openai"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { hub_id, query, limit = 6 } = body
    
    if (!hub_id || !query) {
      return NextResponse.json(
        { error: "hub_id and query required" }, 
        { status: 400 }
      )
    }

    // Generate embedding for the query
    const [qvec] = await embed([query])
    
    // Perform semantic search using PostgreSQL function
    const supabase = createServiceClient()
    const { data, error } = await supabase.rpc("match_whop_docs", {
      query_embedding: qvec,
      match_count: Math.min(limit, 12),
      hub: hub_id,
    })

    if (error) {
      console.error("[Assistant Search] RPC error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ results: data || [] })
  } catch (err: any) {
    console.error("[Assistant Search] Exception:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

