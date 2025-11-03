export const runtime = "nodejs"
export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server"
import { env } from "@/lib/env"
import { getWhopClient } from "@/lib/whop"
import { createServiceClient } from "@/server/db"

export async function GET() {
  try {
    // Check environment variables
    const hasWhopKey = !!env.WHOP_API_KEY
    const hasWhopOrgId = !!env.WHOP_ORG_ID
    const syncEnabled = env.WHOP_SYNC_ENABLED === 'true'
    const demoHubId = env.DEMO_HUB_ID

    // Check if we'll use mock data
    const willUseMock = !hasWhopKey || !hasWhopOrgId

    // Test Whop client
    const client = getWhopClient()
    const clientAvailable = !!client

    // Test Supabase connection
    let dbConnected = false
    try {
      const supabase = createServiceClient()
      const { error } = await supabase.from('members').select('count').limit(1)
      dbConnected = !error
    } catch (err) {
      dbConnected = false
    }

    // Check what data exists in Supabase
    let memberCount = 0
    let productCount = 0
    let sourceCount = 0
    let docCount = 0

    try {
      const supabase = createServiceClient()
      
      const [members, products, sources, docs] = await Promise.all([
        supabase.from('members').select('id', { count: 'exact', head: true }),
        supabase.from('bounties').select('id', { count: 'exact', head: true }),
        supabase.from('ai_sources').select('id', { count: 'exact', head: true }),
        supabase.from('ai_docs').select('id', { count: 'exact', head: true }),
      ])

      memberCount = members.count || 0
      productCount = products.count || 0
      sourceCount = sources.count || 0
      docCount = docs.count || 0
    } catch (err) {
      console.error("[Debug] Error counting data:", err)
    }

    return NextResponse.json({
      environment: {
        hasWhopKey,
        hasWhopOrgId,
        syncEnabled,
        demoHubId,
        willUseMock,
      },
      client: {
        available: clientAvailable,
      },
      database: {
        connected: dbConnected,
        counts: {
          members: memberCount,
          products: productCount,
          sources: sourceCount,
          docs: docCount,
        },
      },
      recommendations: [
        !syncEnabled && "Set WHOP_SYNC_ENABLED=true to enable syncing",
        willUseMock && "No WHOP credentials: will use mock data",
        !hasWhopKey && "WHOP_API_KEY not set",
        !hasWhopOrgId && "WHOP_ORG_ID not set",
        !dbConnected && "Supabase connection failed",
        demoHubId === undefined && "DEMO_HUB_ID not set",
      ].filter(Boolean),
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message, stack: err.stack },
      { status: 500 }
    )
  }
}

