export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { createServiceClient } from "@/server/db"
import { serverEnv } from "@/lib/env.server"

/**
 * Public health check endpoint - no authentication required
 * Returns only non-sensitive status information
 */
export async function GET() {
  try {
    let supabaseOk = false

    // Test Supabase connection with a cheap query
    if (serverEnv.SUPABASE_URL && serverEnv.SUPABASE_SERVICE_ROLE) {
      try {
        const supabase = createServiceClient()
        const { error } = await supabase.from("ai_sources").select("id").limit(1)
        supabaseOk = !error
      } catch (err) {
        console.warn("[Health] Supabase connection failed:", err)
        supabaseOk = false
      }
    }

    const ok = supabaseOk

    // Return only non-sensitive status info - no feature flags or secrets
    return NextResponse.json({
      ok,
      supabase: { ok: supabaseOk },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error("[Health] Unexpected error:", err)
    return NextResponse.json(
      {
        ok: false,
        supabase: { ok: false },
        error: "health_check_failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
