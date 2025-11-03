export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { getSourceStats } from "@/server/ai/content-index"

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

