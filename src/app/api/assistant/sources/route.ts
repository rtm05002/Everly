export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { getSourceStats } from "@/server/ai/content-index"
import { createServiceClient } from "@/server/db"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const hub_id = searchParams.get('hub_id')
    
    if (!hub_id) {
      return NextResponse.json(
        { error: "hub_id required" }, 
        { status: 400 }
      )
    }

    const sources = await getSourceStats(hub_id)
    
    return NextResponse.json(sources)
  } catch (err: any) {
    console.error("[Sources GET] Exception:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { hub_id, kind, name, settings } = body

    if (!hub_id || !kind || !name) {
      return NextResponse.json(
        { error: "hub_id, kind, and name are required" },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()
    
    const { data: source, error } = await supabase
      .from('ai_sources')
      .insert({
        hub_id,
        kind,
        name,
        settings: settings || {},
        config: settings || {}, // Backward compatibility
      })
      .select()
      .single()

    if (error) {
      console.error("[Sources POST] Error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(source)
  } catch (err: any) {
    console.error("[Sources POST] Exception:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

