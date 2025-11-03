export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { assertAdmin, upsertMembers, upsertProducts, upsertOrganizations, upsertSubscriptions } from "../_shared"
import { listMembers, listProducts } from "@/lib/whop"
import { env } from "@/lib/env"

export async function POST(req: NextRequest) {
  try {
    await assertAdmin(req)
  } catch {
    return new NextResponse("unauthorized", { status: 401 })
  }

  const hubId = env.DEMO_HUB_ID
  if (!hubId) {
    return new NextResponse(JSON.stringify({ error: "no hub configured" }), { 
      status: 400,
      headers: { "content-type": "application/json" }
    })
  }

  try {
    // Fetch from Whop
    const [membersData, productsData] = await Promise.all([
      listMembers(hubId),
      listProducts(hubId),
    ])

    // Upsert to DB
    const [membersCount, productsCount, orgsCount, subsCount] = await Promise.all([
      upsertMembers(membersData, hubId),
      upsertProducts(productsData, hubId),
      upsertOrganizations([], hubId), // Placeholder
      upsertSubscriptions([], hubId), // Placeholder
    ])

    const summary = {
      success: true,
      orgs: orgsCount,
      products: productsCount,
      members: membersCount,
      subscriptions: subsCount,
    }

    // Record metric (fire-and-forget)
    try {
      const { recordMetric } = await import("@/server/metrics")
      recordMetric('last_backfill_at', { 
        at: new Date().toISOString(),
        ...summary
      }).catch(() => {})
    } catch {}

    return new NextResponse(JSON.stringify(summary), {
      status: 200,
      headers: { "content-type": "application/json" }
    })
  } catch (error: any) {
    console.error("[Admin Backfill] Error:", error.message)
    console.error("[Admin Backfill] Stack:", error.stack)
    return new NextResponse(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { "content-type": "application/json" }
    })
  }
}

