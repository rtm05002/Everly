export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/server/db'
import { env } from '@/lib/env'

/**
 * Optional background job to sync all URL sources
 * Respects max runtime (2 minutes default)
 * Rate-limited: max 15 pages per source
 */
export async function POST(req: NextRequest) {
  try {
    if (env.ENABLE_URL_FETCHER !== 'true') {
      return NextResponse.json({ ok: false, error: 'URL fetcher disabled' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const startTime = Date.now()
    const maxRuntimeMs = 2 * 60 * 1000 // 2 minutes

    // Get all URL sources
    const { data: sources, error: sourcesError } = await supabase
      .from('ai_sources')
      .select('id, name')
      .eq('kind', 'url')

    if (sourcesError || !sources) {
      return NextResponse.json({ ok: false, error: 'Failed to fetch sources' }, { status: 500 })
    }

    const results: Array<{ sourceId: string; success: boolean; error?: string }> = []

    for (const source of sources) {
      // Check runtime limit
      if (Date.now() - startTime > maxRuntimeMs) {
        results.push({
          sourceId: source.id,
          success: false,
          error: 'Max runtime exceeded',
        })
        break
      }

      try {
        // Call the URL sync endpoint internally
        const syncUrl = `${req.nextUrl.origin}/api/assistant/sources/${source.id}/url-sync`
        const res = await fetch(syncUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // If you need auth, add it here
          },
        })

        const data = await res.json()
        results.push({
          sourceId: source.id,
          success: data.ok === true,
          error: data.error,
        })
      } catch (err: any) {
        results.push({
          sourceId: source.id,
          success: false,
          error: err.message,
        })
      }

      // Small delay between sources
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    return NextResponse.json({
      ok: true,
      processed: results.length,
      results,
    })
  } catch (e: any) {
    console.error('[URL Sync All] Exception:', e)
    return NextResponse.json({ ok: false, error: e?.message ?? 'unknown' }, { status: 500 })
  }
}

