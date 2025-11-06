/**
 * Simple same-origin crawler with rate limiting and timeouts
 */

type FetcherOpts = {
  startUrls: string[]
  allow?: RegExp[]
  deny?: RegExp[]
  maxPages: number
  rps?: number // requests per second (default 1)
  timeoutMs?: number // per request
}

export async function crawl(opts: FetcherOpts): Promise<{ url: string; html: string }[]> {
  const seen = new Set<string>()
  const queue: string[] = []

  const push = (u: string) => {
    const n = u.split('#')[0]
    if (!seen.has(n)) {
      seen.add(n)
      queue.push(n)
    }
  }

  opts.startUrls.forEach(push)

  const pages: { url: string; html: string }[] = []
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))
  const rps = opts.rps ?? 1
  const gap = 1000 / rps
  const controllerTimeout = opts.timeoutMs ?? 15000

  while (queue.length && pages.length < opts.maxPages) {
    const url = queue.shift()!
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), controllerTimeout)

    try {
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timer)

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const ctype = res.headers.get('content-type') || ''
      if (!ctype.includes('text/html')) {
        continue
      }

      const html = await res.text()
      pages.push({ url, html })

      // Find links on same origin
      const base = new URL(url)
      const linkRegex = /href=["']([^"']+)["']/gi
      const links = Array.from(html.matchAll(linkRegex))
        .map((m) => m[1])
        .map((href) => {
          try {
            return new URL(href, base).toString()
          } catch {
            return null
          }
        })
        .filter((u): u is string => !!u)
        .filter((u) => {
          try {
            return new URL(u).origin === base.origin
          } catch {
            return false
          }
        })

      for (const link of links) {
        const allow = opts.allow?.some((r) => r.test(link)) ?? true
        const deny = opts.deny?.some((r) => r.test(link)) ?? false

        if (allow && !deny && pages.length + queue.length < opts.maxPages) {
          push(link)
        }
      }
    } catch (err: any) {
      clearTimeout(timer)
      // Swallow errors; non-fatal
      if (err.name !== 'AbortError') {
        console.warn(`[Crawl] Error fetching ${url}:`, err.message)
      }
    }

    if (gap > 0 && pages.length < opts.maxPages && queue.length > 0) {
      await delay(gap)
    }
  }

  return pages
}

