/**
 * Whop Adapter
 * 
 * Maps Whop API data to Everly's internal data model.
 * Read-only operations for now - bridges Whop's live data to Everly's schema.
 */

import { getWhopClient } from "@/lib/whop"
import type { Member, Bounty, Event, BountyReward, Stats, TrendPoint } from "@/lib/types"
import { env } from "@/lib/env"
import { normalizeStats } from "@/lib/types"

// Helper function for date ranges
async function getWindow(range: "7d" | "30d") {
  const days = range === "7d" ? 7 : 30
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - days)
  return { start: start.toISOString(), end: end.toISOString(), days }
}

function dayKey(d: string | Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.toISOString().slice(0, 10)
}

/**
 * Transform Whop data to Everly format
 * Centralized transformation helper for consistency
 */
function transformWhopData<T>(
  data: any,
  transformer: (item: any) => T | null
): T[] {
  if (!data || !Array.isArray(data)) {
    return []
  }

  return data
    .map(transformer)
    .filter((item): item is T => item !== null)
}

/**
 * Map Whop Membership to Everly Member
 */
function mapWhopMemberToMember(whopMembership: any): Member | null {
  if (!whopMembership?.id) {
    return null
  }

  try {
    return {
      id: whopMembership.id,
      username: whopMembership.user?.username || 
                whopMembership.user?.email || 
                whopMembership.user_id || 
                `user_${whopMembership.id}`,
      joinedAt: whopMembership.created_at || 
                whopMembership.createdAt || 
                new Date().toISOString(),
      lastActiveAt: whopMembership.last_active_at || 
                    whopMembership.updated_at || 
                    whopMembership.created_at || 
                    new Date().toISOString(),
      messagesCount: whopMembership.messages_count || 
                     whopMembership.activity_count || 
                     0,
      roles: whopMembership.roles || 
             (whopMembership.role ? [whopMembership.role] : ["member"]),
    }
  } catch (error) {
    console.error("[Whop Adapter] Error mapping member:", error)
    return null
  }
}

/**
 * Map Whop Product to Everly Bounty
 */
function mapWhopProductToBounty(whopProduct: any): Bounty | null {
  if (!whopProduct?.id || !whopProduct.title) {
    return null
  }

  try {
    // Determine reward type from Whop product structure
    const reward: BountyReward = (() => {
      // Check for USD price
      if (whopProduct.price && typeof whopProduct.price === "number") {
        return {
          type: "usd",
          amount: Math.round(whopProduct.price * 100), // Convert to cents
        }
      }
      
      // Check for points
      if (whopProduct.points) {
        return {
          type: "points",
          amount: whopProduct.points,
        }
      }

      // Check for badge/custom reward
      if (whopProduct.reward_type === "badge" || whopProduct.badge) {
        return {
          type: "badge",
          badge: {
            name: whopProduct.badge?.name || whopProduct.title,
            icon: whopProduct.badge?.icon || "🏆",
            description: whopProduct.badge?.description || whopProduct.description,
          },
        }
      }

      // Default to points if no reward specified
      return {
        type: "points",
        amount: 0,
      }
    })()

    // Determine status
    const status: "active" | "completed" | "archived" = 
      whopProduct.status === "archived" || whopProduct.archived ? "archived" :
      whopProduct.status === "completed" || whopProduct.completed ? "completed" :
      "active"

    return {
      id: whopProduct.id,
      title: whopProduct.title,
      reward,
      status,
      participants: whopProduct.participants_count || 
                    whopProduct.members_count || 
                    whopProduct.purchases_count || 
                    0,
      deadline: whopProduct.deadline || 
                whopProduct.end_date || 
                null,
      createdAt: whopProduct.created_at || 
                 whopProduct.createdAt || 
                 new Date().toISOString(),
    }
  } catch (error) {
    console.error("[Whop Adapter] Error mapping bounty:", error)
    return null
  }
}

/**
 * Map Whop Transaction/Activity to Everly Event
 */
function mapWhopTransactionToEvent(whopTransaction: any, hubId: string): Event | null {
  if (!whopTransaction?.id) {
    return null
  }

  try {
    // Determine event type from Whop transaction/activity type
    let eventType: Event["type"] = "joined"
    
    if (whopTransaction.type) {
      const typeLower = String(whopTransaction.type).toLowerCase()
      if (typeLower.includes("bounty") || typeLower.includes("completed")) {
        eventType = "bounty_completed"
      } else if (typeLower.includes("post") || typeLower.includes("message")) {
        eventType = "posted"
      } else if (typeLower.includes("join") || typeLower.includes("membership")) {
        eventType = "joined"
      } else if (typeLower.includes("announcement")) {
        eventType = "announcement_received"
      }
    }

    // Extract member ID
    const memberId = whopTransaction.user_id || 
                     whopTransaction.member_id || 
                     whopTransaction.membership_id || 
                     ""

    if (!memberId) {
      return null
    }

    // Build metadata
    const metadata: Record<string, any> = {}
    
    if (whopTransaction.amount) {
      metadata.amount = whopTransaction.amount
    }
    
    if (whopTransaction.product_id) {
      metadata.bountyId = whopTransaction.product_id
    }

    if (whopTransaction.product_name || whopTransaction.product?.title) {
      metadata.bountyTitle = whopTransaction.product_name || whopTransaction.product?.title
    }

    return {
      type: eventType,
      memberId,
      ts: whopTransaction.created_at || 
          whopTransaction.createdAt || 
          new Date().toISOString(),
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    }
  } catch (error) {
    console.error("[Whop Adapter] Error mapping event:", error)
    return null
  }
}

/**
 * Get members for a hub from Whop
 * @param hubId - The hub/company ID (maps to Whop company ID)
 * @returns Array of Member objects
 */
export async function getMembers(hubId: string): Promise<Member[]> {
  const client = getWhopClient()
  if (!client) {
    console.warn("[Whop Adapter] Cannot get members: Client not available")
    return []
  }

  try {
    // Try to get memberships for the company
    let whopData: any[] = []

    console.log("[Whop Adapter] Client available, attempting to fetch members...")
    console.log("[Whop Adapter] Client methods:", Object.keys(client).slice(0, 10))

    // Method 1: Try memberships.list with companyId
    if (client.memberships?.list) {
      console.log("[Whop Adapter] Using client.memberships.list()")
      const response = await client.memberships.list({ companyId: hubId })
      whopData = response?.data || response?.memberships || response || []
    }
    // Method 2: Try listMembers with companyId
    else if (client.listMembers) {
      console.log("[Whop Adapter] Using client.listMembers()")
      const response: any = await client.listMembers(hubId)
      whopData = Array.isArray(response) ? response : response?.data || []
    }
    // Method 3: Try getMemberships
    else if (client.getMemberships) {
      console.log("[Whop Adapter] Using client.getMemberships()")
      const response = await client.getMemberships(hubId)
      whopData = Array.isArray(response) ? response : response?.data || []
    }
    // Method 4: Use helper function from whop.ts
    else {
      console.log("[Whop Adapter] Using helper function listMembers()")
      const { listMembers } = await import("@/lib/whop")
      whopData = await listMembers(hubId)
    }

    console.log(`[Whop Adapter] Raw Whop data received: ${whopData.length} items`)
    if (whopData.length > 0) {
      console.log("[Whop Adapter] Sample item:", JSON.stringify(whopData[0], null, 2).substring(0, 200))
    }

    const mapped = transformWhopData(whopData, mapWhopMemberToMember)
    console.log(`[Whop Adapter] Mapped to ${mapped.length} members`)
    
    return mapped
  } catch (error: any) {
    console.error("[Whop Adapter] Error getting members:", error.message)
    console.error("[Whop Adapter] Error stack:", error.stack)
    return []
  }
}

/**
 * Get bounties/products for a hub from Whop
 * @param hubId - The hub/company ID (maps to Whop company ID)
 * @returns Array of Bounty objects
 */
export async function getBounties(hubId: string): Promise<Bounty[]> {
  const client = getWhopClient()
  if (!client) {
    console.warn("[Whop Adapter] Cannot get bounties: Client not available")
    return []
  }

  try {
    // Try to get products for the company
    let whopData: any[] = []

    // Method 1: Try products.list with companyId
    if (client.products?.list) {
      const response = await client.products.list({ companyId: hubId })
      whopData = response?.data || response?.products || response || []
    }
    // Method 2: Try listProducts with companyId
    else if (client.listProducts) {
      const response: any = await client.listProducts(hubId)
      whopData = Array.isArray(response) ? response : response?.data || []
    }
    // Method 3: Try getProducts
    else if (client.getProducts) {
      const response = await client.getProducts(hubId)
      whopData = Array.isArray(response) ? response : response?.data || []
    }
    // Method 4: Use helper function from whop.ts
    else {
      const { listProducts } = await import("@/lib/whop")
      whopData = await listProducts(hubId)
    }

    return transformWhopData(whopData, mapWhopProductToBounty)
  } catch (error: any) {
    console.error("[Whop Adapter] Error getting bounties:", error.message)
    return []
  }
}

/**
 * Get events/transactions for a hub from Whop
 * @param hubId - The hub/company ID (maps to Whop company ID)
 * @returns Array of Event objects
 */
export async function getEvents(hubId: string): Promise<Event[]> {
  const client = getWhopClient()
  if (!client) {
    console.warn("[Whop Adapter] Cannot get events: Client not available")
    return []
  }

  try {
    // Try to get transactions/activities for the company
    let whopData: any[] = []

    // Method 1: Try transactions.list with companyId
    if (client.transactions?.list) {
      const response = await client.transactions.list({ companyId: hubId })
      whopData = response?.data || response?.transactions || response || []
    }
    // Method 2: Try activities.list
    else if (client.activities?.list) {
      const response = await client.activities.list({ companyId: hubId })
      whopData = response?.data || response?.activities || response || []
    }
    // Method 3: Try listTransactions
    else if (client.listTransactions) {
      const response: any = await client.listTransactions(hubId)
      whopData = Array.isArray(response) ? response : response?.data || []
    }
    // Method 4: Try getTransactions
    else if (client.getTransactions) {
      const response = await client.getTransactions(hubId)
      whopData = Array.isArray(response) ? response : response?.data || []
    }
    else {
      // If no transaction endpoint, return empty array
      console.warn("[Whop Adapter] No transaction/activity endpoint available")
      return []
    }

    return transformWhopData(whopData, (item) => mapWhopTransactionToEvent(item, hubId))
  } catch (error: any) {
    console.error("[Whop Adapter] Error getting events:", error.message)
    return []
  }
}

/**
 * Whop DataAdapter implementation
 * Implements the full DataAdapter interface for Everly
 */
export const whopAdapter = {
  async getStats(range: "7d" | "30d"): Promise<Stats> {
    const hubId = env.DEMO_HUB_ID || ""
    if (!hubId) {
      console.warn("[Whop Adapter] DEMO_HUB_ID not configured")
      return normalizeStats({
        membersTotal: 0,
        activeUsers: 0,
        messagesCount: 0,
        bountiesCompleted: 0,
        engagementTrend: [],
      })
    }

    const { start, end, days } = await getWindow(range)
    const [members, bounties, events] = await Promise.all([
      getMembers(hubId),
      getBounties(hubId),
      getEvents(hubId),
    ])

    // Filter events within the date range
    const recentEvents = events.filter((e) => {
      const eventDate = new Date(e.ts)
      return eventDate >= new Date(start) && eventDate <= new Date(end)
    })

    // Calculate stats
    const membersTotal = members.length
    const activeMemberIds = new Set(recentEvents.map((e) => e.memberId))
    const activeUsers = activeMemberIds.size
    const messagesCount = recentEvents.filter((e) => e.type === "posted").length
    const bountiesCompleted = recentEvents.filter((e) => e.type === "bounty_completed").length

    // Build engagement trend
    const byDay: Record<string, number> = {}
    for (const e of recentEvents) {
      const k = dayKey(e.ts)
      byDay[k] = (byDay[k] ?? 0) + 1
    }

    const engagementTrend: TrendPoint[] = []
    const cursor = new Date(start)
    const endDate = new Date(end)
    while (cursor <= endDate) {
      const k = dayKey(cursor)
      engagementTrend.push({
        date: new Date(cursor).toISOString(),
        dau: byDay[k] ?? 0,
      })
      cursor.setDate(cursor.getDate() + 1)
    }

    return normalizeStats({
      membersTotal,
      activeUsers,
      messagesCount,
      bountiesCompleted,
      engagementTrend,
    })
  },

  async getStatsWithDeltas(): Promise<{
    current: Stats
    previous: Stats
    deltas: {
      membersTotal: number
      activeUsers: number
      messagesCount: number
      bountiesCompleted: number
    }
  }> {
    const hubId = env.DEMO_HUB_ID || ""
    if (!hubId) {
      const emptyStats = normalizeStats({
        membersTotal: 0,
        activeUsers: 0,
        messagesCount: 0,
        bountiesCompleted: 0,
        engagementTrend: [],
      })
      return {
        current: emptyStats,
        previous: emptyStats,
        deltas: { membersTotal: 0, activeUsers: 0, messagesCount: 0, bountiesCompleted: 0 },
      }
    }

    const now = new Date()
    const currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const previousStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    const [members, events] = await Promise.all([getMembers(hubId), getEvents(hubId)])

    // Filter events for both periods
    const currentEvents = events.filter((e) => new Date(e.ts) >= currentStart)
    const previousEvents = events.filter((e) => {
      const d = new Date(e.ts)
      return d >= previousStart && d < currentStart
    })

    // Calculate current period stats
    const currentActiveUsers = new Set(currentEvents.map((e) => e.memberId)).size
    const currentMessagesCount = currentEvents.filter((e) => e.type === "posted").length
    const currentBountiesCompleted = currentEvents.filter((e) => e.type === "bounty_completed").length

    // Calculate previous period stats
    const previousActiveUsers = new Set(previousEvents.map((e) => e.memberId)).size
    const previousMessagesCount = previousEvents.filter((e) => e.type === "posted").length
    const previousBountiesCompleted = previousEvents.filter((e) => e.type === "bounty_completed").length

    // Build engagement trend
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const trendEvents = events.filter((e) => new Date(e.ts) >= thirtyDaysAgo)
    const byDay: Record<string, number> = {}
    for (const e of trendEvents) {
      const k = dayKey(e.ts)
      byDay[k] = (byDay[k] ?? 0) + 1
    }

    const engagementTrend: TrendPoint[] = []
    const cursor = new Date(thirtyDaysAgo)
    while (cursor <= now) {
      const k = dayKey(cursor)
      engagementTrend.push({
        date: new Date(cursor).toISOString(),
        dau: byDay[k] ?? 0,
      })
      cursor.setDate(cursor.getDate() + 1)
    }

    const membersTotal = members.length

    const current = normalizeStats({
      membersTotal,
      activeUsers: currentActiveUsers,
      messagesCount: currentMessagesCount,
      bountiesCompleted: currentBountiesCompleted,
      engagementTrend: engagementTrend.slice(-7),
    })

    const previous = normalizeStats({
      membersTotal,
      activeUsers: previousActiveUsers,
      messagesCount: previousMessagesCount,
      bountiesCompleted: previousBountiesCompleted,
      engagementTrend: engagementTrend.slice(-14, -7),
    })

    // Calculate deltas
    const deltas = {
      membersTotal:
        previous.membersTotal > 0
          ? ((current.membersTotal - previous.membersTotal) / previous.membersTotal) * 100
          : 0,
      activeUsers:
        previous.activeUsers > 0
          ? ((current.activeUsers - previous.activeUsers) / previous.activeUsers) * 100
          : 0,
      messagesCount:
        previous.messagesCount > 0
          ? ((current.messagesCount - previous.messagesCount) / previous.messagesCount) * 100
          : 0,
      bountiesCompleted:
        previous.bountiesCompleted > 0
          ? ((current.bountiesCompleted - previous.bountiesCompleted) / previous.bountiesCompleted) * 100
          : 0,
    }

    return { current, previous, deltas }
  },

  async listBounties(): Promise<Bounty[]> {
    const hubId = env.DEMO_HUB_ID || ""
    if (!hubId) {
      console.warn("[Whop Adapter] DEMO_HUB_ID not configured")
      return []
    }
    return getBounties(hubId)
  },

  async createBounty(input: Pick<Bounty, "title" | "reward" | "deadline">): Promise<Bounty> {
    // Read-only for now - throw error or return mock
    throw new Error("Whop adapter is read-only. Use Supabase adapter for write operations.")
  },

  async updateBounty(id: string, patch: Partial<Bounty>, memberId?: string): Promise<Bounty> {
    // Read-only for now
    throw new Error("Whop adapter is read-only. Use Supabase adapter for write operations.")
  },

  async deleteBounty(id: string): Promise<void> {
    // Read-only for now
    throw new Error("Whop adapter is read-only. Use Supabase adapter for write operations.")
  },

  async listMembers(): Promise<Member[]> {
    const hubId = env.DEMO_HUB_ID || ""
    if (!hubId) {
      console.warn("[Whop Adapter] DEMO_HUB_ID not configured")
      return []
    }
    return getMembers(hubId)
  },

  async recentEvents(): Promise<Event[]> {
    const hubId = env.DEMO_HUB_ID || ""
    if (!hubId) {
      console.warn("[Whop Adapter] DEMO_HUB_ID not configured")
      return []
    }
    return getEvents(hubId)
  },
}

