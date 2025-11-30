export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { execSync } from "node:child_process"
import { createAdminClient } from "@/lib/supabase-admin"

async function authorize(req: Request) {
  const token = req.headers.get("x-admin-token")
  if (!process.env.ADMIN_TASK_TOKEN || token !== process.env.ADMIN_TASK_TOKEN) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }
  return null
}

export async function GET(req: Request) {
  const unauthorized = await authorize(req)
  if (unauthorized) {
    return unauthorized
  }

  try {
    const db = createAdminClient()
    const [{ count: docsCount, error: docsErr }, { count: pendingCount, error: pendingErr }] = await Promise.all([
      db.from("ai_docs").select("*", { count: "exact", head: true }),
      db.from("ai_chunks").select("*", { count: "exact", head: true }).eq("needs_embedding", true),
    ])

    if (docsErr || pendingErr) {
      throw docsErr || pendingErr!
    }

    return NextResponse.json({
      ok: true,
      totals: {
        docs: docsCount ?? 0,
        pendingEmbeddings: pendingCount ?? 0,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message ?? "status_failed" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const unauthorized = await authorize(req)
  if (unauthorized) {
    return unauthorized
  }

  try {
    execSync("pnpm tsx scripts/backfill-embeddings.ts", { stdio: "pipe" })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    const message = error?.stderr?.toString?.() || error?.message || "backfill_failed"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

