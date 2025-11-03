export const runtime = "nodejs"
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { renderTemplate } from "@/server/nudges/template"
import { enqueueNudge } from "@/server/nudges/db"
import { env } from "@/lib/env"

const dispatchSchema = z.object({
  hub_id: z.string(),
  nudges: z.array(z.object({
    member_id: z.string(),
    recipe_name: z.string(),
    message: z.string(),
    variables: z.any().optional(),
    channel: z.string().optional(),
  })),
})

export async function POST(req: NextRequest) {
  // Check if nudges are enabled
  if (env.NUDGES_ENABLED !== 'true') {
    return new NextResponse(JSON.stringify({ error: 'nudges_disabled' }), { 
      status: 503,
      headers: { 'content-type': 'application/json' }
    })
  }

  try {
    // Parse and validate request body
    const rawBody = await req.json()
    const parseResult = dispatchSchema.safeParse(rawBody)
    
    if (!parseResult.success) {
      return new NextResponse(JSON.stringify({ error: 'invalid_request', details: parseResult.error }), { 
        status: 400,
        headers: { 'content-type': 'application/json' }
      })
    }
    
    const { hub_id, nudges } = parseResult.data
    
    // Render templates and enqueue each nudge
    const results = []
    for (const nudge of nudges) {
      const renderedMessage = renderTemplate(nudge.message, nudge.variables || {})
      
      const result = await enqueueNudge({
        hub_id,
        member_id: nudge.member_id,
        recipe_name: nudge.recipe_name,
        message: renderedMessage,
        variables: nudge.variables,
        channel: nudge.channel,
      })
      
      results.push(result)
    }
    
    const enqueued = results.filter(r => r.enqueued).length
    const skipped = results.length - enqueued
    
    return new NextResponse(JSON.stringify({
      ok: true,
      enqueued,
      skipped,
      results,
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    })
  } catch (err) {
    console.error('[nudge:dispatch] exception:', err)
    return new NextResponse(JSON.stringify({ error: 'internal_error' }), { 
      status: 500,
      headers: { 'content-type': 'application/json' }
    })
  }
}

