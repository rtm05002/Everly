export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { syncWhopForHub } from "@/server/whop/sync"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  const { sourceId } = await params
  
  try {
    const body = await req.json()
    const { hub_id } = body
    
    if (!hub_id) {
      return NextResponse.json(
        { error: "hub_id required" }, 
        { status: 400 }
      )
    }

    // Perform sync (includes feature flag check, rate limiting, and job logging)
    const result = await syncWhopForHub(hub_id)

    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(
        { error: result.error || "Sync failed" },
        { status: 500 }
      )
    }
  } catch (err: any) {
    console.error("[Sources Sync] Exception:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
