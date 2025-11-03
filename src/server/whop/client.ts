import { getWhopClient } from "@/lib/whop"
import { env } from "@/lib/env"

/**
 * Get Whop client with organization header
 */
export function getWhopClientWithOrg() {
  const client = getWhopClient()
  if (!client) {
    return null
  }
  
  // Set organization header if available
  if (env.WHOP_ORG_ID) {
    // Note: The @whop/sdk may handle this differently
    // This is a placeholder for organization context
  }
  
  return client
}

/**
 * Paginate helper for Whop API
 * Handles rate limiting with exponential backoff
 */
export async function paginate(
  fn: (page?: number) => Promise<any[]>,
  maxRetries = 3
): Promise<any[]> {
  const allResults: any[] = []
  let page = 1
  let hasMore = true
  let retries = 0

  while (hasMore && retries < maxRetries) {
    try {
      const results = await fn(page)
      
      if (!results || results.length === 0) {
        hasMore = false
      } else {
        allResults.push(...results)
        // If results are less than a page size, likely last page
        hasMore = results.length >= 50 // Assuming 50 is typical page size
        page++
      }
      retries = 0 // Reset on success
    } catch (error: any) {
      if (error?.status === 429 && retries < maxRetries) {
        // Rate limited - exponential backoff with jitter
        const delay = Math.pow(2, retries) * 1000 + Math.random() * 1000
        console.warn(`[Whop Client] Rate limited, retrying after ${delay}ms`)
        await new Promise(resolve => setTimeout(resolve, delay))
        retries++
      } else {
        console.error("[Whop Client] Pagination error:", error.message)
        throw error
      }
    }
  }

  return allResults
}

