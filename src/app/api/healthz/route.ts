export const runtime = "nodejs"
export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"
import { readAllMetrics } from "@/server/metrics"

export async function GET() {
  const startTime = Date.now()
  let dbOk = false
  let dbLatencyMs: number | undefined
  
  // Check DB connectivity
  try {
    const supabase = getSupabaseServer()
    const dbStart = Date.now()
    
    // Simple query to check connectivity
    const { error } = await supabase
      .from('hubs')
      .select('id')
      .limit(1)
    
    dbLatencyMs = Date.now() - dbStart
    dbOk = !error
    
    if (error) {
      console.error('[healthz] DB check failed:', error.message)
    }
  } catch (err) {
    console.error('[healthz] DB check exception:', err)
    dbOk = false
  }
  
  // Read metrics
  const allMetrics = await readAllMetrics()
  const metrics = {
    lastWebhookAt: allMetrics['last_webhook_at']?.at,
    lastSyncAt: allMetrics['last_sync_at']?.at,
    lastBackfillAt: allMetrics['last_backfill_at']?.at,
  }
  
  const response = {
    ok: dbOk,
    db: {
      ok: dbOk,
      latencyMs: dbLatencyMs,
    },
    metrics,
    commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
    env: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
    timestamp: new Date().toISOString(),
    uptimeMs: Date.now() - startTime,
  }
  
  return NextResponse.json(response, {
    status: dbOk ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, must-revalidate',
    },
  })
}

