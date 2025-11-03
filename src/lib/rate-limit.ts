interface RateLimitEntry {
  requests: number[]
  windowStart: number
}

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      // Remove entries older than 1 hour
      if (now - entry.windowStart > 60 * 60 * 1000) {
        this.store.delete(key)
      }
    }
  }

  private getKey(ip: string, endpoint: string): string {
    return `${ip}:${endpoint}`
  }

  private isAllowed(entry: RateLimitEntry, config: RateLimitConfig): boolean {
    const now = Date.now()
    const windowStart = now - config.windowMs

    // Remove old requests outside the window
    entry.requests = entry.requests.filter(timestamp => timestamp > windowStart)

    // Check if we're under the limit
    return entry.requests.length < config.maxRequests
  }

  private addRequest(entry: RateLimitEntry): void {
    entry.requests.push(Date.now())
  }

  private getRetryAfter(entry: RateLimitEntry, config: RateLimitConfig): number {
    if (entry.requests.length === 0) return 0
    
    // Find the oldest request in the current window
    const oldestRequest = Math.min(...entry.requests)
    const retryAfter = Math.ceil((oldestRequest + config.windowMs - Date.now()) / 1000)
    
    return Math.max(0, retryAfter)
  }

  checkLimit(ip: string, endpoint: string, config: RateLimitConfig): {
    allowed: boolean
    retryAfter?: number
  } {
    const key = this.getKey(ip, endpoint)
    const now = Date.now()

    // Get or create entry
    let entry = this.store.get(key)
    if (!entry) {
      entry = {
        requests: [],
        windowStart: now
      }
      this.store.set(key, entry)
    }

    // Check if request is allowed
    const allowed = this.isAllowed(entry, config)
    
    if (allowed) {
      this.addRequest(entry)
      return { allowed: true }
    } else {
      const retryAfter = this.getRetryAfter(entry, config)
      return { allowed: false, retryAfter }
    }
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter()

// Rate limit configurations
export const RATE_LIMITS = {
  'POST /api/widget/session': {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20
  },
  '/api/hub/:hubId/ai/query': {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5
  },
  '/api/sync/whop': {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 1
  }
} as const

export function checkRateLimit(
  ip: string, 
  endpoint: string, 
  config: RateLimitConfig
): { allowed: boolean; retryAfter?: number } {
  return rateLimiter.checkLimit(ip, endpoint, config)
}

export function getRateLimitConfig(endpoint: string): RateLimitConfig | null {
  // Handle exact matches first
  if (endpoint in RATE_LIMITS) {
    return RATE_LIMITS[endpoint as keyof typeof RATE_LIMITS]
  }

  // Handle pattern matches (like /api/hub/:hubId/ai/query)
  for (const [pattern, config] of Object.entries(RATE_LIMITS)) {
    if (pattern.includes(':')) {
      // Convert pattern to regex
      const regexPattern = pattern.replace(/:[^/]+/g, '[^/]+')
      const regex = new RegExp(`^${regexPattern}$`)
      if (regex.test(endpoint)) {
        return config
      }
    }
  }

  return null
}

// Cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    rateLimiter.destroy()
  })
}


