/**
 * Whop Emulator Adapter
 * 
 * Generates synthetic data with Whop-like IDs for development/testing.
 * Useful for instant UI testing without hitting the real Whop API.
 * 
 * Data is deterministic (same seed = same results) but uses Whop-like ID formats.
 */

import type { Member, Bounty, Event, BountyReward, Stats, TrendPoint } from "@/lib/types"
import { normalizeStats } from "@/lib/types"
import { env } from "@/lib/env"

// Deterministic seed for consistent generation
const SEED = 12345

// Simple seeded random number generator
function seededRandom(seed: number) {
  let value = seed
  return () => {
    value = (value * 9301 + 49297) % 233280
    return value / 233280
  }
}

// Generate Whop-like member ID
function whopMemberId(index: number): string {
  return `whop_mem_${String(index).padStart(6, "0")}`
}

// Generate Whop-like bounty ID
function whopBountyId(index: number): string {
  return `whop_bounty_${String(index).padStart(6, "0")}`
}

// Generate synthetic members (~30 members)
function generateMembers(): Member[] {
  const members: Member[] = []
  const rng = seededRandom(SEED)
  const names = [
    "Alex", "Jordan", "Taylor", "Casey", "Morgan", "Riley", "Quinn", "Sage",
    "River", "Skylar", "Phoenix", "Rowan", "Blake", "Cameron", "Dakota",
    "Emery", "Finley", "Harper", "Hayden", "Indigo", "Jaden", "Kai", "Logan",
    "Noah", "Parker", "Reese", "Sawyer", "Sydney", "Tatum", "Winter"
  ]

  const tiers = ["Pro", "Basic", "Premium", "Free", "Enterprise"]
  const roles = ["member", "admin", "moderator"]

  const now = new Date()
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  for (let i = 0; i < 30; i++) {
    const joinedDaysAgo = Math.floor(rng() * 60)
    const joinedAt = new Date(sixtyDaysAgo.getTime() + joinedDaysAgo * 24 * 60 * 60 * 1000)
    
    const lastActiveDaysAgo = Math.floor(rng() * Math.min(joinedDaysAgo + 1, 30))
    const lastActiveAt = new Date(joinedAt.getTime() + lastActiveDaysAgo * 24 * 60 * 60 * 1000)

    members.push({
      id: whopMemberId(i + 1),
      username: names[i] || `user_${i + 1}`,
      joinedAt: joinedAt.toISOString(),
      lastActiveAt: lastActiveAt.toISOString(),
      messagesCount: Math.floor(rng() * 50),
      roles: [roles[Math.floor(rng() * roles.length)]],
    })
  }

  return members
}

// Generate synthetic bounties (2-3 bounties)
function generateBounties(): Bounty[] {
  const rng = seededRandom(SEED + 1000)
  const bounties: Bounty[] = []

  const titles = [
    "Post your introduction",
    "Complete your first challenge",
    "Share your project"
  ]

  const rewards: BountyReward[] = [
    { type: "usd", amount: 500 }, // $5.00 in cents
    { type: "points", amount: 100 },
    {
      type: "badge",
      badge: {
        name: "First Step",
        icon: "🎯",
        description: "Completed your first challenge"
      }
    }
  ]

  const now = new Date()
  const statuses: ("active" | "completed" | "archived")[] = ["active", "active", "completed"]

  for (let i = 0; i < 3; i++) {
    const createdDaysAgo = Math.floor(rng() * 30)
    const createdAt = new Date(now.getTime() - createdDaysAgo * 24 * 60 * 60 * 1000)
    
    const deadlineDays = Math.floor(rng() * 14) + 7
    const deadline = new Date(now.getTime() + deadlineDays * 24 * 60 * 60 * 1000)

    bounties.push({
      id: whopBountyId(i + 1),
      title: titles[i] || `Challenge ${i + 1}`,
      reward: rewards[i],
      status: statuses[i],
      participants: Math.floor(rng() * 20) + 1,
      deadline: i < 2 ? deadline.toISOString() : null,
      createdAt: createdAt.toISOString(),
    })
  }

  return bounties
}

// Generate synthetic events over last 60 days
function generateEvents(members: Member[], bounties: Bounty[]): Event[] {
  const events: Event[] = []
  const rng = seededRandom(SEED + 2000)
  
  const now = new Date()
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  // Generate events for each day
  for (let day = 0; day < 60; day++) {
    const date = new Date(sixtyDaysAgo.getTime() + day * 24 * 60 * 60 * 1000)
    
    // Random number of events per day (0-10)
    const eventsPerDay = Math.floor(rng() * 11)
    
    for (let i = 0; i < eventsPerDay; i++) {
      const member = members[Math.floor(rng() * members.length)]
      const bounty = bounties[Math.floor(rng() * bounties.length)]
      
      // Random event type
      const eventTypeRoll = rng()
      let eventType: Event["type"]
      let metadata: Record<string, any> | undefined

      if (eventTypeRoll < 0.4) {
        // 40% chance: posted message
        eventType = "posted"
        metadata = {
          channel_id: `channel_${Math.floor(rng() * 5)}`,
          url: `/c/channel_${Math.floor(rng() * 5)}/msg_${i}`,
        }
      } else if (eventTypeRoll < 0.6) {
        // 20% chance: joined
        eventType = "joined"
      } else if (eventTypeRoll < 0.85) {
        // 25% chance: bounty completed
        eventType = "bounty_completed"
        metadata = {
          bountyId: bounty.id,
          bountyTitle: bounty.title,
        }
      } else {
        // 15% chance: announcement received
        eventType = "announcement_received"
      }

      // Random time within the day
      const hours = Math.floor(rng() * 24)
      const minutes = Math.floor(rng() * 60)
      const seconds = Math.floor(rng() * 60)
      const eventTime = new Date(date)
      eventTime.setHours(hours, minutes, seconds)

      events.push({
        type: eventType,
        memberId: member.id,
        ts: eventTime.toISOString(),
        metadata: metadata,
      })
    }
  }

  // Sort by timestamp
  events.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())

  return events
}

// Cache generated data (regenerated on each request for freshness, but deterministic)
let cachedMembers: Member[] | null = null
let cachedBounties: Bounty[] | null = null
let cachedEvents: Event[] | null = null

function getMembers(): Member[] {
  if (!cachedMembers) {
    cachedMembers = generateMembers()
  }
  return cachedMembers
}

function getBounties(): Bounty[] {
  if (!cachedBounties) {
    cachedBounties = generateBounties()
  }
  return cachedBounties
}

function getEvents(): Event[] {
  if (!cachedEvents) {
    cachedEvents = generateEvents(getMembers(), getBounties())
  }
  return cachedEvents
}

// Helper for date ranges
function getWindow(range: "7d" | "30d") {
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
 * Whop Emulator DataAdapter implementation
 * Generates synthetic data with Whop-like IDs
 */
export const whopEmulatedAdapter = {
  async getStats(range: "7d" | "30d"): Promise<Stats> {
    const { start, end } = getWindow(range)
    const members = getMembers()
    const events = getEvents()

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
    const now = new Date()
    const currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const previousStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    const members = getMembers()
    const events = getEvents()

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
    return getBounties()
  },

  async createBounty(input: Pick<Bounty, "title" | "reward" | "deadline">): Promise<Bounty> {
    // Read-only for now - throw error
    throw new Error("Whop emulator adapter is read-only. Use Supabase adapter for write operations.")
  },

  async updateBounty(id: string, patch: Partial<Bounty>, memberId?: string): Promise<Bounty> {
    // Read-only for now
    throw new Error("Whop emulator adapter is read-only. Use Supabase adapter for write operations.")
  },

  async deleteBounty(id: string): Promise<void> {
    // Read-only for now
    throw new Error("Whop emulator adapter is read-only. Use Supabase adapter for write operations.")
  },

  async listMembers(): Promise<Member[]> {
    return getMembers()
  },

  async recentEvents(): Promise<Event[]> {
    // Return last 30 days of events
    const events = getEvents()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    return events.filter((e) => new Date(e.ts) >= thirtyDaysAgo)
  },
}

