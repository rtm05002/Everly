export const runtime = "nodejs"
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server"
import { fetchWhopProducts, fetchWhopMembers, fetchWhopSubscriptions } from "@/server/whop/fetchers"
import { mapWhopProducts, mapWhopMembers } from "@/server/whop/mappers"
import { createServiceClient } from "@/server/db"
import { env } from "@/lib/env"

export async function POST(req: NextRequest) {
  try {
    const hubId = env.DEMO_HUB_ID
    if (!hubId) {
      return NextResponse.json(
        { error: "DEMO_HUB_ID not set" },
        { status: 400 }
      )
    }

    console.log(`[Test Sync] Starting test sync for hub ${hubId}`)

    // Fetch data using mock or real Whop
    const [products, members, subscriptions] = await Promise.all([
      fetchWhopProducts(hubId),
      fetchWhopMembers(hubId),
      fetchWhopSubscriptions(hubId),
    ])

    console.log(`[Test Sync] Fetched: ${products.length} products, ${members.length} members, ${subscriptions.length} subscriptions`)

    // Map to Supabase
    const supabase = createServiceClient()
    
    // Map products to sources/docs/chunks
    const { sources: sourcesCount, docs: docsCount } = await mapWhopProducts(hubId, products)
    console.log(`[Test Sync] Mapped: ${sourcesCount} sources, ${docsCount} docs`)
    
    // Map members
    const membersCount = await mapWhopMembers(hubId, members)
    console.log(`[Test Sync] Mapped: ${membersCount} members`)

    // Verify what got inserted
    const [finalMembers, finalSources, finalDocs] = await Promise.all([
      supabase.from('members').select('id', { count: 'exact', head: true }),
      supabase.from('ai_sources').select('id', { count: 'exact', head: true }),
      supabase.from('ai_docs').select('id', { count: 'exact', head: true }),
    ])

    return NextResponse.json({
      success: true,
      fetched: {
        products: products.length,
        members: members.length,
        subscriptions: subscriptions.length,
      },
      mapped: {
        sources: sourcesCount,
        docs: docsCount,
        members: membersCount,
      },
      verified: {
        membersInDb: finalMembers.count || 0,
        sourcesInDb: finalSources.count || 0,
        docsInDb: finalDocs.count || 0,
      },
    })
  } catch (err: any) {
    console.error("[Test Sync] Error:", err)
    return NextResponse.json(
      { 
        success: false, 
        error: err.message,
        stack: err.stack 
      },
      { status: 500 }
    )
  }
}

