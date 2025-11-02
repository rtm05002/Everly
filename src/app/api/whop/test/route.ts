export const runtime = "nodejs"
import { NextResponse } from "next/server"
import { getMembers } from "@/server/adapters/whopAdapter"
import { getWhopClient, isWhopAvailable } from "@/lib/whop"
import { env } from "@/lib/env"

/**
 * Test route for Whop adapter
 * Only available in development mode
 */
export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const hubId = env.DEMO_HUB_ID

    if (!hubId) {
      return NextResponse.json(
        { error: "DEMO_HUB_ID not configured" },
        { status: 400 }
      )
    }

    console.log(`[Whop Test] Fetching members for hub: ${hubId}`)
    console.log(`[Whop Test] WHOP_API_KEY configured: ${!!process.env.WHOP_API_KEY}`)
    
    const members = await getMembers(hubId)
    
    console.log(`[Whop Test] Fetched ${members.length} members from Whop`)
    
    if (members.length === 0) {
      console.warn(`[Whop Test] No members returned. This could mean:
        - WHOP_API_KEY is missing or invalid
        - Hub ID doesn't exist in Whop
        - Whop SDK methods don't match expected API
        - No memberships exist for this company`)
    }

    return NextResponse.json({
      ok: true,
      members,
      hubId,
      debug: {
        hasApiKey: !!process.env.WHOP_API_KEY,
        memberCount: members.length,
      },
    })
  } catch (error: any) {
    console.error("[Whop Test] Error:", error)
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Failed to fetch members from Whop",
      },
      { status: 500 }
    )
  }
}

