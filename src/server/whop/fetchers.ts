import { getWhopClient } from "@/lib/whop"
import { env } from "@/lib/env"
import { paginate } from "./client"
import { mapWhopProducts, mapWhopMembers } from "./mappers"
import { getMockProducts, getMockMembers, getMockSubscriptions } from "./mock"

/**
 * Fetch all Whop products with pagination
 */
export async function fetchWhopProducts(hubId: string): Promise<any[]> {
  // Check if we should use mock data
  if (!env.WHOP_API_KEY || !env.WHOP_ORG_ID) {
    console.log("[Whop Fetchers] Using mock products (no credentials)")
    return getMockProducts(hubId)
  }

  const client = getWhopClient()
  if (!client) {
    console.warn("[Whop Fetchers] Client not available, falling back to mock")
    return getMockProducts(hubId)
  }

  try {
    // Use the existing listProducts helper with pagination
    const fn = async (page?: number) => {
      const response: any = await client.products?.list({ companyId: hubId, page })
      return Array.isArray(response) ? response : response?.data || []
    }
    
    return await paginate(fn)
  } catch (error: any) {
    console.error("[Whop Fetchers] Error fetching products:", error.message)
    console.log("[Whop Fetchers] Falling back to mock products")
    return getMockProducts(hubId)
  }
}

/**
 * Fetch all Whop members with pagination
 */
export async function fetchWhopMembers(hubId: string): Promise<any[]> {
  // Check if we should use mock data
  if (!env.WHOP_API_KEY || !env.WHOP_ORG_ID) {
    console.log("[Whop Fetchers] Using mock members (no credentials)")
    return getMockMembers(hubId)
  }

  const client = getWhopClient()
  if (!client) {
    console.warn("[Whop Fetchers] Client not available, falling back to mock")
    return getMockMembers(hubId)
  }

  try {
    const fn = async (page?: number) => {
      const response: any = await client.members?.list({ companyId: hubId, page })
      return Array.isArray(response) ? response : response?.data || []
    }
    
    return await paginate(fn)
  } catch (error: any) {
    console.error("[Whop Fetchers] Error fetching members:", error.message)
    console.log("[Whop Fetchers] Falling back to mock members")
    return getMockMembers(hubId)
  }
}

/**
 * Fetch all Whop subscriptions/orders with pagination
 */
export async function fetchWhopSubscriptions(hubId: string): Promise<any[]> {
  // Check if we should use mock data
  if (!env.WHOP_API_KEY || !env.WHOP_ORG_ID) {
    console.log("[Whop Fetchers] Using mock subscriptions (no credentials)")
    return getMockSubscriptions(hubId)
  }

  const client = getWhopClient()
  if (!client) {
    console.warn("[Whop Fetchers] Client not available, falling back to mock")
    return getMockSubscriptions(hubId)
  }

  try {
    // Try different possible endpoints
    if (client.subscriptions?.list) {
      const fn = async (page?: number) => {
        const response: any = await client.subscriptions.list({ companyId: hubId, page })
        return Array.isArray(response) ? response : response?.data || []
      }
      return await paginate(fn)
    } else if (client.orders?.list) {
      const fn = async (page?: number) => {
        const response: any = await client.orders.list({ companyId: hubId, page })
        return Array.isArray(response) ? response : response?.data || []
      }
      return await paginate(fn)
    }
    
    console.warn("[Whop Fetchers] Subscriptions endpoint not found, falling back to mock")
    return getMockSubscriptions(hubId)
  } catch (error: any) {
    console.error("[Whop Fetchers] Error fetching subscriptions:", error.message)
    console.log("[Whop Fetchers] Falling back to mock subscriptions")
    return getMockSubscriptions(hubId)
  }
}

/**
 * Main sync function that fetches and maps all Whop data
 */
export async function syncWhopData(hubId: string): Promise<{
  products: number
  members: number
  sources: number
  docs: number
}> {
  if (env.WHOP_SYNC_ENABLED !== 'true') {
    throw new Error("Whop sync is not enabled")
  }

  console.log(`[Whop Sync] Starting sync for hub ${hubId}`)

  // Fetch all data
  const [products, members] = await Promise.all([
    fetchWhopProducts(hubId),
    fetchWhopMembers(hubId),
  ])

  // Map products to sources/docs
  const { sources, docs } = await mapWhopProducts(hubId, products)
  
  // Map members
  const membersCount = await mapWhopMembers(hubId, members)

  console.log(`[Whop Sync] Completed: ${sources} sources, ${docs} docs, ${membersCount} members`)

  return {
    products: products.length,
    members: membersCount,
    sources,
    docs,
  }
}

