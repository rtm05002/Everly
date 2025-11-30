export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { semanticSearch } from "@/lib/rag/search"
import { clientIpFromHeaders, rateLimit } from "@/server/guard/rateLimit"
import { sanitizePrompt } from "@/server/guard/input"
import { logServer } from "@/server/log"
import { DEMO_MODE, DEMO_HUB_ID } from "@/lib/env.server"

const SAFE_KINDS = ["whop:announcements", "whop:hub", "whop:posts", "url"]

async function getWidgetContext(req: Request) {
  const body = await req.json().catch(() => ({}))
  // In demo mode, always use DEMO_HUB_ID (ignore body)
  const hubId = DEMO_MODE && DEMO_HUB_ID ? DEMO_HUB_ID : (body.hubId || process.env.DEMO_HUB_ID || null)
  return {
    hubId,
    memberId: body.memberId || null,
    message: typeof body.message === "string" ? body.message : "",
    history: Array.isArray(body.history) ? body.history : [],
  }
}

export async function POST(req: Request) {
  let ctx: { hubId: string | null; memberId: string | null; message: string } | null = null
  try {
    // Allow chat in demo mode, only block if explicitly disabled AND not in demo mode
    const isDemoMode = process.env.DEMO_MODE === "true" || process.env.DEMO_HUB_ID
    if (process.env.NEXT_PUBLIC_FEATURE_MEMBER_CHAT === "false" && !isDemoMode) {
      return NextResponse.json({ ok: false, error: "temporarily_disabled" }, { status: 503 })
    }

    const ip = clientIpFromHeaders(req.headers)
    const rlIp = rateLimit({ scope: "ip", key: ip, windowSec: 60, max: 20 })
    if (!rlIp.allowed) {
      return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 })
    }

    ctx = await getWidgetContext(req)
    const { hubId, memberId, message } = ctx
    if (!hubId) {
      return NextResponse.json({ ok: false, error: "hub missing" }, { status: 400 })
    }
    const rlHub = rateLimit({ scope: "hub", key: hubId, windowSec: 60, max: 120 })
    if (!rlHub.allowed) {
      return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 })
    }

    const sanitizedMessage = sanitizePrompt(message)
    if (!sanitizedMessage.trim()) {
      return NextResponse.json({ ok: false, error: "empty message" }, { status: 400 })
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { ok: false, error: "supabase env missing" },
        { status: 500 },
      )
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 25_000)

    let hits: any[] = []
    try {
      const searchPromise = semanticSearch({ hubId, query: sanitizedMessage, k: 8 })
      const abortPromise = new Promise<never>((_, reject) => {
        controller.signal.addEventListener("abort", () => {
          reject(new Error("timeout"))
        })
      })
      hits = await Promise.race([searchPromise, abortPromise])
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error?.message === "timeout" || controller.signal.aborted) {
        console.warn("[Widget Chat] Request timeout")
        return NextResponse.json({ ok: false, error: "timeout" }, { status: 504 })
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }

    const safe = (hits || [])
      .filter((hit: any) => SAFE_KINDS.includes(hit.source_kind || hit.kind))
      .slice(0, 4)

    const top = safe[0]
    const answer = top
      ? `Here’s what I found:\n\n${top.text.slice(0, 600)}${top.text.length > 600 ? "…" : ""}`
      : "I couldn’t find that in the community content."

    return NextResponse.json({
      ok: true,
      answer,
      snippets: safe.map((s: any) => ({
        title: s.title,
        url: s.url,
        score: s.score,
        text: s.text,
      })),
    })
  } catch (error: any) {
    console.warn("[Widget Chat] Chat failed:", error?.message || String(error))
    await logServer({
      level: "error",
      event: "widget_chat_failed",
      hubId: ctx?.hubId || undefined,
      meta: { message: error?.message || String(error) },
    })
    return NextResponse.json({ ok: false, error: "chat_failed" }, { status: 500 })
  }
}

