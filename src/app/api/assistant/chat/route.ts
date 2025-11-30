export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { openai } from "@/lib/openai"
import { createServiceClient } from "@/server/db"
import { embed } from "@/lib/openai"
import { semanticSearch } from "@/lib/rag/search"
import { safeLogAI } from "@/lib/ai/logs"
import { getHubContextFromHeaders } from "@/lib/request-context"
import { clientIpFromHeaders, rateLimit } from "@/server/guard/rateLimit"
import { sanitizePrompt } from "@/server/guard/input"
import { logServer } from "@/server/log"

const SYSTEM_PROMPT = `You are Everly's helpful assistant for community engagement. Use the provided context to answer questions accurately.

Rules:
- Only use information from the "Context" section
- Answer strictly using the provided CONTEXT. If the answer is not in CONTEXT, say you don't know
- If the context doesn't contain relevant information, say "I don't have information about that in the community content"
- Keep answers concise and actionable
- Always include a "Sources" list at the end when using context
- Be friendly and supportive`

export async function POST(req: NextRequest) {
  try {
    if (process.env.NEXT_PUBLIC_FEATURE_CREATOR_CHAT === "false") {
      return NextResponse.json({ ok: false, error: "temporarily_disabled" }, { status: 503 })
    }

    const ip = clientIpFromHeaders(req.headers)
    const rlIp = rateLimit({ scope: "ip", key: ip, windowSec: 60, max: 20 })
    if (!rlIp.allowed) {
      return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 })
    }

    const ctx = getHubContextFromHeaders(req.headers)
    if (!ctx.hubId) {
      return NextResponse.json({ ok: false, error: "missing hub" }, { status: 401 })
    }

    const rlHub = rateLimit({ scope: "hub", key: ctx.hubId, windowSec: 60, max: 120 })
    if (!rlHub.allowed) {
      return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 })
    }

    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 })
    }

    const { hubId, messages: rawMessages, message } = body ?? {}

    let messages = rawMessages as { role: string; content: string }[] | undefined

    // Support a simple `message` string from the UI
    if ((!messages || messages.length === 0) && typeof message === "string" && message.trim()) {
      messages = [{ role: "user", content: message.trim() }]
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "messages required" },
        { status: 400 },
      )
    }

    const lastMessage = messages[messages.length - 1]
    const rawQuery = (lastMessage?.content as string) || ""
    const query = sanitizePrompt(rawQuery)

    if (!query.trim()) {
      return NextResponse.json(
        { error: "No query in messages" },
        { status: 400 },
      )
    }

    console.log(`[Assistant Chat] Searching for: ${query.substring(0, 50)}...`)

    let searchResults: any[] = []
    try {
      const hits = await semanticSearch({ hubId: ctx.hubId, query, k: 12 })
      searchResults = hits.map((h) => ({
        title: h.title || "Untitled",
        url: h.url,
        source: h.source_kind,
        content: h.text,
        score: h.score,
      }))
    } catch (searchErr: any) {
      console.warn("[Assistant Chat] New semantic search failed, falling back to old method:", searchErr?.message)
      searchResults = await searchContext(ctx.hubId, query, 6)
    }

    const context = searchResults
      .map((r: any, i: number) => `[${i + 1}] ${r.title || r.source} (${r.url || "no-url"})\n${r.content || r.text || ""}`)
      .join("\n\n---\n\n")

    const messagesWithContext: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Question:\n${query}\n\nContext:\n${context || "(none available)"}` },
    ]

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 25_000)

    let chatResponse
    try {
      chatResponse = await openai.chat.completions.create(
        {
          model: "gpt-4o-mini",
          messages: messagesWithContext,
          temperature: 0.2,
          max_tokens: 1000,
        },
        { signal: controller.signal },
      )
    } catch (err: any) {
      clearTimeout(timeoutId)
      if (err.name === "AbortError" || err.message?.includes("aborted")) {
        console.warn("[Assistant Chat] Request timeout")
        return NextResponse.json({ ok: false, error: "timeout" }, { status: 504 })
      }
      throw err
    } finally {
      clearTimeout(timeoutId)
    }

    const answer = chatResponse.choices[0]?.message?.content || "Sorry, I couldn't generate a reply."

    const sources = searchResults.map((r: any) => ({
      title: r.title || r.source || "Untitled",
      url: r.url,
      source: r.source,
    }))

    await safeLogAI({
      hubId: ctx.hubId,
      kind: "chat",
      tokensIn: 0,
      tokensOut: 0,
      latencyMs: 0,
      meta: { messageLength: query.length },
    })

    const snippets = searchResults.slice(0, 3).map((h: any) => ({ title: h.title, url: h.url, score: h.score, text: h.text }))

    return NextResponse.json({
      ok: true,
      answer,
      sources,
      snippets,
    })
  } catch (err: any) {
    console.warn("[Assistant Chat] Chat failed:", err?.message || String(err))
    await logServer({
      level: "error",
      event: "chat_failed",
      hubId: getHubContextFromHeaders(req.headers).hubId,
      meta: { message: err?.message || String(err) },
    })
    return NextResponse.json({ ok: false, error: "chat_failed" }, { status: 500 })
  }
}

async function searchContext(hub_id: string, query: string, limit: number) {
  try {
    const [qvec] = await embed([query])
    const supabase = createServiceClient()
    const { data, error } = await supabase.rpc("match_whop_docs", {
      query_embedding: qvec,
      match_count: limit,
      hub: hub_id,
    })

    if (error) {
      console.error("[Assistant Chat] Search RPC error:", error)
      return []
    }

    return data || []
  } catch (err) {
    console.error("[Assistant Chat] Search exception:", err)
    return []
  }
}

