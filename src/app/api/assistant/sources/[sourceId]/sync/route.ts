export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"
import { syncWhopData } from "@/server/whop/fetchers"
import { createServiceClient } from "@/server/db"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  const { sourceId } = await params
  
  try {
    // Check if Whop sync is enabled
    if (env.WHOP_SYNC_ENABLED !== 'true') {
      return NextResponse.json(
        { error: "Whop sync is not enabled" }, 
        { status: 404 }
      )
    }

    const body = await req.json()
    const { hub_id } = body
    
    if (!hub_id) {
      return NextResponse.json(
        { error: "hub_id required" }, 
        { status: 400 }
      )
    }

    // TODO: Add rate limiting check (1 run per hub per 5 min)

    // Log sync start
    const supabase = createServiceClient()
    const { data: syncRun } = await supabase
      .from("ai_sync_runs")
      .insert({
        source_id: sourceId,
        status: "running",
        stats: {},
      })
      .select()
      .single()

    // Perform sync
    const result = await syncWhopData(hub_id)

    // Log sync completion
    if (syncRun?.id) {
      await supabase
        .from("ai_sync_runs")
        .update({
          status: "completed",
          stats: result,
          finished_at: new Date().toISOString(),
        })
        .eq("id", syncRun.id)
    }

    return NextResponse.json({ 
      success: true,
      ...result 
    })
  } catch (err: any) {
    console.error("[Sources Sync] Exception:", err)
    
    // Try to mark sync as failed
    try {
      const supabase = createServiceClient()
      const { data: lastRun } = await supabase
        .from("ai_sync_runs")
        .select("id")
        .eq("source_id", sourceId)
        .eq("status", "running")
        .order("started_at", { ascending: false })
        .limit(1)
        .single()
      
      if (lastRun) {
        await supabase
          .from("ai_sync_runs")
          .update({
            status: "failed",
            stats: { error: err.message },
            finished_at: new Date().toISOString(),
          })
          .eq("id", lastRun.id)
      }
    } catch {}

    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
