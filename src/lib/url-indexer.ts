import crypto from 'crypto'
import { JSDOM } from 'jsdom'

/**
 * Hash function for content deduplication
 */
export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}

/**
 * Normalize URL (remove hash, trailing slash, etc.)
 */
export function normalizeUrl(u: string): string {
  try {
    const url = new URL(u)
    url.hash = ''
    // Remove trailing slash for consistency
    if (url.pathname.endsWith('/') && url.pathname !== '/') {
      url.pathname = url.pathname.slice(0, -1)
    }
    return url.toString()
  } catch {
    return u
  }
}

/**
 * Extract clean text from HTML
 */
export function extractTextFromHtml(html: string): { title: string; text: string } {
  try {
    const dom = new JSDOM(html)
    const doc = dom.window.document

    // Remove script/style/noscript/iframe
    doc.querySelectorAll('script,style,noscript,iframe').forEach((n: Element) => n.remove())

    const articleish = doc.querySelector('main, article, [role="main"]') || doc.body
    const title = (doc.querySelector('title')?.textContent || '').trim()
    const text = (articleish?.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()

    return { title, text }
  } catch (err) {
    console.error('[URL Indexer] Error extracting text:', err)
    return { title: '', text: '' }
  }
}

/**
 * Simple, deterministic chunker: ~1000-1400 chars with overlap
 */
export function chunkText(text: string, target = 1200, overlap = 100): string[] {
  const chunks: string[] = []
  let i = 0

  while (i < text.length) {
    const end = Math.min(text.length, i + target)
    chunks.push(text.slice(i, end).trim())

    if (end === text.length) break

    i = end - overlap
    if (i < 0) i = 0
  }

  return chunks.filter(Boolean)
}

