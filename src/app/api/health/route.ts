export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { createServiceClient } from "@/server/db"
import { serverEnv, FEATURE_WHOP_SYNC, DEMO_MODE } from "@/lib/env.server"

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

    return NextResponse.json({
      ok,
      supabase: { ok: supabaseOk },
      features: {
        whopSync: FEATURE_WHOP_SYNC,
        demoMode: DEMO_MODE,
      },
    })
  } catch (err) {
    console.error("[Health] Unexpected error:", err)
    return NextResponse.json(
      {
        ok: false,
        supabase: { ok: false },
        features: {
          whopSync: FEATURE_WHOP_SYNC,
          demoMode: DEMO_MODE,
        },
        error: "health_check_failed",
      },
      { status: 500 }
    )
  }
}
