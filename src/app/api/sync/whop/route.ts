export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { syncWhopForHub } from "@/server/whop/sync"

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await req.json()
    const { hubId, full } = body
    
    if (!hubId) {
      return NextResponse.json(
        { ok: false, error: "hubId required" }, 
        { status: 400 }
      )
    }

    // Perform sync (includes feature flag check and rate limiting)
    const result = await syncWhopForHub(hubId, { full })

    const durationMs = Date.now() - startTime

    if (result.success) {
      return NextResponse.json({
        ok: true,
        jobId: result.products.toString(), // TODO: Return actual job ID
        counts: {
          products: result.products,
          members: result.members,
          subscriptions: result.subscriptions,
          docsUpserted: result.docs,
          chunksEmbedded: result.chunks,
        },
        durationMs,
      })
    } else {
      return NextResponse.json(
        { 
          ok: false, 
          error: result.error || "Sync failed",
          durationMs,
        }, 
        { status: 500 }
      )
    }
  } catch (err: any) {
    console.error("[Sync Whop] Exception:", err)
    const durationMs = Date.now() - startTime
    return NextResponse.json(
      { 
        ok: false, 
        error: err.message,
        durationMs,
      }, 
      { status: 500 }
    )
  }
}

