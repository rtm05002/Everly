export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/server/db'
import { crawl } from '@/lib/crawl'
import { chunkText, extractTextFromHtml, sha256, normalizeUrl } from '@/lib/url-indexer'
import { embedBatch } from '@/lib/embed'
import { env } from '@/lib/env'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    if (env.ENABLE_URL_FETCHER !== 'true') {
      return NextResponse.json({ ok: false, error: 'URL fetcher disabled' }, { status: 400 })
    }

    const { sourceId } = await params
    const supabase = createServiceClient()

    // 1) Load source
    const { data: src, error: srcErr } = await supabase
      .from('ai_sources')
      .select('*')
      .eq('id', sourceId)
      .single()

    if (srcErr || !src) {
      return NextResponse.json({ ok: false, error: 'Source not found' }, { status: 404 })
    }

    if (src.kind !== 'url') {
      return NextResponse.json({ ok: false, error: 'Wrong source kind' }, { status: 400 })
    }

    const settings = (src.settings || {}) as {
      start_urls?: string[]
      allow_patterns?: string[]
      deny_patterns?: string[]
      max_pages?: number
    }

    const startUrls = (settings.start_urls || []).map(normalizeUrl).filter(Boolean)
    if (!startUrls.length) {
      return NextResponse.json({ ok: false, error: 'No start_urls configured' }, { status: 400 })
    }

    const maxPages = Math.min(
      Number(settings.max_pages ?? env.MAX_URL_PAGES ?? 15),
      100
    )

    const allow = (settings.allow_patterns || []).map((s) => {
      try {
        return new RegExp(s)
      } catch {
        return null
      }
    }).filter((r): r is RegExp => r !== null)

    const deny = (settings.deny_patterns || []).map((s) => {
      try {
        return new RegExp(s)
      } catch {
        return null
      }
    }).filter((r): r is RegExp => r !== null)

    // 2) Crawl
    const pages = await crawl({
      startUrls,
      allow: allow.length > 0 ? allow : undefined,
      deny: deny.length > 0 ? deny : undefined,
      maxPages,
      rps: 1,
      timeoutMs: 15000,
    })

    // 3) Upsert docs + chunks
    let totalDocs = 0
    let totalChunks = 0

    for (const p of pages) {
      const { title, text } = extractTextFromHtml(p.html)
      if (!text || text.length < 200) continue

      const contentHash = sha256(text)

      // Check if doc exists with same hash; if so skip heavy work
      const { data: existingDoc } = await supabase
        .from('ai_docs')
        .select('id, content_hash')
        .eq('source_id', sourceId)
        .eq('url', p.url)
        .maybeSingle()

      if (existingDoc && existingDoc.content_hash === contentHash) {
        continue // unchanged
      }

      // Upsert doc using external_id (URL as external_id for URL sources)
      // Try source_id,url constraint first, fallback to source_id,external_id
      const { data: docRow, error: docErr } = await supabase
        .from('ai_docs')
        .upsert(
          {
            source_id: sourceId,
            external_id: p.url, // Use URL as external_id
            title: title || p.url,
            url: p.url,
            content_hash: contentHash,
          },
          { onConflict: 'source_id,external_id' }
        )
        .select('id')
        .single()

      if (docErr || !docRow) {
        console.error('[URL Sync] Error upserting doc:', docErr)
        continue
      }

      totalDocs += 1

      // Delete old chunks (if any)
      await supabase.from('ai_chunks').delete().eq('doc_id', docRow.id)

      const chunks = chunkText(text, 1200, 100)
      totalChunks += chunks.length

      // Embed (if key) or mark needs_embedding
      const embeddings = await embedBatch(chunks).catch(() => null)

      const rows = chunks.map((content, i) => ({
        doc_id: docRow.id,
        idx: i,
        content,
        embedding: embeddings ? embeddings[i] : null,
        needs_embedding: embeddings ? false : true,
        token_count: Math.ceil(content.length / 4), // Rough estimate
      }))

      // Insert in batches
      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50)
        const { error: chunkErr } = await supabase.from('ai_chunks').insert(batch)
        if (chunkErr) {
          console.error('[URL Sync] Error inserting chunks:', chunkErr)
        }
      }
    }

    // 4) Update counters
    try {
      // Try using the RPC function first
      const { data: counts } = await supabase.rpc('refresh_ai_source_counts', {
        p_source_id: sourceId,
      })

      if (counts && counts.length > 0) {
        await supabase
          .from('ai_sources')
          .update({
            last_synced_at: new Date().toISOString(),
            doc_count: counts[0].doc_count,
            chunk_count: counts[0].chunk_count,
          })
          .eq('id', sourceId)
      } else {
        // Fallback: manual count
        const { count: docCount } = await supabase
          .from('ai_docs')
          .select('*', { count: 'exact', head: true })
          .eq('source_id', sourceId)

        // Get chunk count
        const { data: docIds } = await supabase
          .from('ai_docs')
          .select('id')
          .eq('source_id', sourceId)

        let chunkCount = 0
        if (docIds && docIds.length > 0) {
          const { count } = await supabase
            .from('ai_chunks')
            .select('*', { count: 'exact', head: true })
            .in('doc_id', docIds.map((d) => d.id))

          chunkCount = count || 0
        }

        await supabase
          .from('ai_sources')
          .update({
            last_synced_at: new Date().toISOString(),
            doc_count: docCount || 0,
            chunk_count: chunkCount,
          })
          .eq('id', sourceId)
      }
    } catch (err) {
      console.error('[URL Sync] Error updating counts:', err)
      // Still update timestamp
      await supabase
        .from('ai_sources')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', sourceId)
    }

    return NextResponse.json({
      ok: true,
      totalDocs,
      totalChunks,
      pages: pages.length,
    })
  } catch (e: any) {
    console.error('[URL Sync] Exception:', e)
    return NextResponse.json({ ok: false, error: e?.message ?? 'unknown' }, { status: 500 })
  }
}

