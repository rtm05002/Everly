export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { syncWhopSource, WhopSyncInput } from "@/lib/whop/fetchers"
import { createServiceClient } from "@/server/db"
import { assertServerEnv } from "@/lib/check-env"
import { getHubContextFromHeaders } from "@/lib/request-context"
import { DEMO_MODE, DEMO_HUB_ID } from "@/lib/env.server"

// Runtime env check in development only
if (process.env.NODE_ENV === "development") {
  assertServerEnv([
    "WHOP_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE",
    "OPENAI_API_KEY",
  ])
}

// Extend WhopSyncInput to make hubId optional in body (will be derived from auth or body)
const Body = WhopSyncInput.extend({
  hubId: z.string().min(1).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))

    const ctx = getHubContextFromHeaders(req.headers)
    const authHeader = req.headers.get("authorization")
    const adminAllowed =
      process.env.ADMIN_TASK_TOKEN && authHeader === `Bearer ${process.env.ADMIN_TASK_TOKEN}`

    // In demo mode, always use DEMO_HUB_ID (override ctx and body)
    const hubId = DEMO_MODE && DEMO_HUB_ID ? DEMO_HUB_ID : (ctx.hubId ?? body.hubId)

    if (!hubId || (!ctx.hubId && !adminAllowed && !DEMO_MODE)) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
    }

    if (adminAllowed && !body.hubId) {
      return NextResponse.json({ ok: false, error: "hubId required" }, { status: 400 })
    }

    if (!body.kind) {
      return NextResponse.json(
        { ok: false, error: "Missing required field: kind" },
        { status: 400 },
      )
    }

    const db = createServiceClient()
    const { data: recent } = await db
      .from("ai_sync_runs")
      .select("started_at, source_id")
      .eq("source_id", hubId)
      .order("started_at", { ascending: false })
      .limit(1)

    if (
      recent?.[0]?.started_at &&
      Date.now() - new Date(recent[0].started_at).getTime() < 5 * 60 * 1000
    ) {
      return NextResponse.json(
        { ok: false, error: "sync throttled, try later" },
        { status: 429 },
      )
    }

    const input = Body.parse({
      hubId,
      kind: body.kind,
      sourceId: body.sourceId,
      maxItems: body.maxItems,
    })

    // Sync Whop content (hubId is guaranteed to be defined at this point)
    const result = await syncWhopSource({
      hubId: input.hubId!,
      kind: input.kind,
      sourceId: input.sourceId,
      maxItems: input.maxItems,
    })

    // TODO: Optionally insert an ai_sync_runs row for audit trail
    // This would track sync history similar to other sync endpoints

    return NextResponse.json({
      ok: true,
      ...result,
    })
  } catch (err: any) {
    // Handle Zod validation errors
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Invalid input", details: err.issues },
        { status: 400 },
      )
    }

    console.error("[Whop Sync] Exception:", err)
    return NextResponse.json(
      { ok: false, error: err.message || "Internal server error" },
      { status: 500 },
    )
  }
}

