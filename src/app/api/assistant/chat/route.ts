export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { openai } from "@/lib/openai"
import { createServiceClient } from "@/server/db"
import { embed } from "@/lib/openai"

const SYSTEM_PROMPT = `You are Everly's helpful assistant for community engagement. Use the provided context to answer questions accurately.

Rules:
- Only use information from the "Context" section
- If the context doesn't contain relevant information, say "I don't have information about that in the community content"
- Keep answers concise and actionable
- Always include a "Sources" list at the end when using context
- Be friendly and supportive`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { hub_id, messages } = body
    
    if (!hub_id || !messages) {
      return NextResponse.json(
        { error: "hub_id and messages required" }, 
        { status: 400 }
      )
    }

    // Get the last user message
    const lastMessage = messages[messages.length - 1]
    const query = lastMessage?.content as string
    
    if (!query) {
      return NextResponse.json(
        { error: "No query in messages" }, 
        { status: 400 }
      )
    }

    // Perform semantic search for context
    console.log(`[Assistant Chat] Searching for: ${query.substring(0, 50)}...`)
    const searchResults = await searchContext(hub_id, query, 6)
    
    // Build context from search results
    const context = searchResults
      .map((r: any, i: number) => `[${i + 1}] ${r.title || r.source} (${r.url || "no-url"})\n${r.content}`)
      .join("\n\n---\n\n")

    // Build messages with context
    const messagesWithContext: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Question:\n${query}\n\nContext:\n${context || "(none available)"}` },
    ]

    // Generate chat completion
    const chatResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messagesWithContext,
      temperature: 0.2,
      max_tokens: 1000,
    })

    const answer = chatResponse.choices[0]?.message?.content || "Sorry, I couldn't generate a reply."
    
    // Extract and format sources
    const sources = searchResults.map((r: any) => ({
      title: r.title || r.source || "Untitled",
      url: r.url,
      source: r.source,
    }))

    return NextResponse.json({
      answer,
      sources,
    })
  } catch (err: any) {
    console.error("[Assistant Chat] Exception:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * Helper function to search for context using semantic search
 */
async function searchContext(hub_id: string, query: string, limit: number) {
  try {
    // Generate embedding for the query
    const [qvec] = await embed([query])
    
    // Perform semantic search using PostgreSQL function
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

