export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { backfillSourceStats } from "@/server/ai/content-index"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { hub_id } = body
    
    if (!hub_id) {
      return NextResponse.json(
        { error: "hub_id required" }, 
        { status: 400 }
      )
    }

    // TODO: Add auth check for admin/owner
    // For now, allow if hub_id is provided (temporary)
    
    const result = await backfillSourceStats(hub_id)
    
    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (err: any) {
    console.error("[Sources Backfill] Exception:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

