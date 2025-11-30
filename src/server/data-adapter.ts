import { Stats, Bounty, Member, Event, TrendPoint, normalizeStats, BountyReward } from '@/lib/types'
import { read, write } from './store'
import { env } from '@/lib/env'
import { DEMO_MODE, DEMO_HUB_ID, serverEnv } from '@/lib/env.server'
import { createServiceClient } from './db'
import { whopAdapter } from './adapters/whopAdapter'
import { whopEmulatedAdapter } from './adapters/whopEmulatedAdapter'

export interface DataAdapter {
  getStats(range: "7d" | "30d"): Promise<Stats>
  getStatsWithDeltas(): Promise<{ current: Stats; previous: Stats; deltas: { membersTotal: number; activeUsers: number; messagesCount: number; bountiesCompleted: number } }>
  listBounties(): Promise<Bounty[]>
  createBounty(input: Pick<Bounty, "title" | "reward" | "deadline">): Promise<Bounty>
  updateBounty(id: string, patch: Partial<Bounty>, memberId?: string): Promise<Bounty>
  deleteBounty(id: string): Promise<void>
  listMembers(): Promise<Member[]>
  recentEvents(): Promise<Event[]>
}

// Seed data for first run
const seedBounties: Bounty[] = [
  {
    id: "1",
    title: "Create a welcome video",
    reward: { type: "usd", amount: 5000 },
    status: "active",
    participants: 12,
    deadline: "2024-01-25T23:59:59Z",
    createdAt: "2024-01-18T10:30:00Z"
  },
  {
    id: "2",
    title: "Write a community guide",
    reward: { type: "points", amount: 100 },
    status: "active",
    participants: 8,
    deadline: "2024-01-28T23:59:59Z",
    createdAt: "2024-01-17T14:20:00Z"
  },
  {
    id: "3",
    title: "Design social media templates",
    reward: { 
      type: "badge", 
      badge: { 
        name: "Design Master", 
        icon: "🎨", 
        description: "Awarded for exceptional design work" 
      } 
    },
    status: "completed",
    participants: 15,
    deadline: null,
    createdAt: "2024-01-15T09:15:00Z"
  },
  {
    id: "4",
    title: "Organize community event",
    reward: { type: "usd", amount: 15000 },
    status: "active",
    participants: 6,
    deadline: "2024-02-01T23:59:59Z",
    createdAt: "2024-01-16T11:45:00Z"
  }
]

const seedMembers: Member[] = [
  {
    id: "1",
    username: "Sarah Chen",
    joinedAt: "2024-01-15T10:30:00Z",
    lastActiveAt: "2024-01-20T14:22:00Z",
    messagesCount: 234,
    roles: ["member"]
  },
  {
    id: "2",
    username: "Alex Rivera",
    joinedAt: "2024-01-10T09:15:00Z",
    lastActiveAt: "2024-01-20T16:45:00Z",
    messagesCount: 456,
    roles: ["member", "moderator"]
  },
  {
    id: "3",
    username: "Jordan Lee",
    joinedAt: "2024-01-18T11:20:00Z",
    lastActiveAt: "2024-01-19T08:30:00Z",
    messagesCount: 89,
    roles: ["member"]
  },
  {
    id: "4",
    username: "Morgan Blake",
    joinedAt: "2024-01-05T14:45:00Z",
    lastActiveAt: "2024-01-20T12:15:00Z",
    messagesCount: 678,
    roles: ["member"]
  },
  {
    id: "5",
    username: "Taylor Swift",
    joinedAt: "2024-01-12T16:30:00Z",
    lastActiveAt: "2024-01-20T10:20:00Z",
    messagesCount: 123,
    roles: ["member", "admin"]
  }
]

const seedEvents: Event[] = [
  {
    type: "posted",
    memberId: "1",
    ts: "2024-01-20T14:22:00Z",
    metadata: { channel: "#general" }
  },
  {
    type: "bounty_completed",
    memberId: "4",
    ts: "2024-01-20T12:15:00Z",
    metadata: { bountyId: "3" }
  },
  {
    type: "joined",
    memberId: "3",
    ts: "2024-01-19T08:30:00Z"
  },
  {
    type: "posted",
    memberId: "2",
    ts: "2024-01-19T16:45:00Z",
    metadata: { channel: "#announcements" }
  },
  {
    type: "streak_missed",
    memberId: "5",
    ts: "2024-01-18T10:20:00Z"
  }
]

// Generate engagement trend data with deterministic seed
function seedTrend(days = 60): TrendPoint[] {
  const out: TrendPoint[] = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    out.push({ 
      date: d.toISOString().split('T')[0], 
      dau: Math.max(0, Math.round(3000 + 800 * Math.sin(i / 6))) 
    })
  }
  return out
}

const engagementTrend = seedTrend(60)

// Helper function to compute engagement trend from events
function computeEngagementTrend(events: Event[], days: number): TrendPoint[] {
  const trend: TrendPoint[] = []
  const today = new Date()
  
  // Group events by date
  const eventsByDate = new Map<string, Set<string>>()
  
  events.forEach(event => {
    const eventDate = new Date(event.ts)
    const dateKey = eventDate.toISOString().split('T')[0]
    
    if (!eventsByDate.has(dateKey)) {
      eventsByDate.set(dateKey, new Set())
    }
    eventsByDate.get(dateKey)!.add(event.memberId)
  })
  
  // Generate trend data for the last N days
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    const dateKey = date.toISOString().split('T')[0]
    
    const dailyActiveUsers = eventsByDate.get(dateKey)?.size || 0
    
    trend.push({
      date: dateKey,
      dau: dailyActiveUsers
    })
  }
  
  return trend
}

// Helper function to seed data if not exists
async function ensureSeeded() {
  const bounties = await read<Bounty[]>('bounties')
  if (!bounties) {
    await write('bounties', seedBounties)
  }
  
  const members = await read<Member[]>('members')
  if (!members) {
    await write('members', seedMembers)
  }
  
  const events = await read<Event[]>('events')
  if (!events) {
    await write('events', seedEvents)
  }
}

const mockAdapter: DataAdapter = {
  async getStats(range: "7d" | "30d"): Promise<Stats> {
    await ensureSeeded()
    
    // Get events and AI logs from store
    const events = await read<Event[]>('events') || []
    const aiLogs = await read<any[]>('ai_logs') || []
    const members = await read<Member[]>('members') || []
    
    // Calculate date range
    const now = new Date()
    const daysBack = range === "7d" ? 7 : 30
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000))
    
    // Filter events within the range
    const recentEvents = events.filter(event => {
      const eventDate = new Date(event.ts)
      return eventDate >= startDate
    })
    
    // Compute bountiesCompleted from events
    const bountiesCompleted = recentEvents.filter(event => event.type === "bounty_completed").length
    
    // Compute messagesCount from AI logs
    const messagesCount = aiLogs.length
    
    // Compute activeUsers (members with any event in the window)
    const activeMemberIds = new Set(recentEvents.map(event => event.memberId))
    const activeUsers = activeMemberIds.size
    
    // Compute engagementTrend from events over 60 days
    const engagementTrend = computeEngagementTrend(events, 60)
    
    const rawStats = {
      membersTotal: members.length,
      activeUsers,
      messagesCount,
      bountiesCompleted,
      engagementTrend: range === "7d" ? engagementTrend.slice(-7) : engagementTrend
    }
    
    return normalizeStats(rawStats)
  },

  async getStatsWithDeltas(): Promise<{ current: Stats; previous: Stats; deltas: { membersTotal: number; activeUsers: number; messagesCount: number; bountiesCompleted: number } }> {
    await ensureSeeded()
    
    // Get events and AI logs from store
    const events = await read<Event[]>('events') || []
    const aiLogs = await read<any[]>('ai_logs') || []
    const members = await read<Member[]>('members') || []
    
    // Calculate date ranges
    const now = new Date()
    const currentStart = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000))
    const previousStart = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000))
    
    // Filter events for current period (last 7 days)
    const currentEvents = events.filter(event => {
      const eventDate = new Date(event.ts)
      return eventDate >= currentStart
    })
    
    // Filter events for previous period (7-14 days ago)
    const previousEvents = events.filter(event => {
      const eventDate = new Date(event.ts)
      return eventDate >= previousStart && eventDate < currentStart
    })
    
    // Compute current period stats
    const currentBountiesCompleted = currentEvents.filter(event => event.type === "bounty_completed").length
    const currentActiveMemberIds = new Set(currentEvents.map(event => event.memberId))
    const currentActiveUsers = currentActiveMemberIds.size
    
    // Compute previous period stats
    const previousBountiesCompleted = previousEvents.filter(event => event.type === "bounty_completed").length
    const previousActiveMemberIds = new Set(previousEvents.map(event => event.memberId))
    const previousActiveUsers = previousActiveMemberIds.size
    
    // Compute engagementTrend from events over 60 days
    const engagementTrend = computeEngagementTrend(events, 60)
    
    // Current period (last 7 days)
    const current = normalizeStats({
      membersTotal: members.length,
      activeUsers: currentActiveUsers,
      messagesCount: aiLogs.length,
      bountiesCompleted: currentBountiesCompleted,
      engagementTrend: engagementTrend.slice(-7)
    })
    
    // Previous period (7 days before that)
    const previous = normalizeStats({
      membersTotal: members.length,
      activeUsers: previousActiveUsers,
      messagesCount: Math.max(0, aiLogs.length - 10), // Simulate some AI logs from previous period
      bountiesCompleted: previousBountiesCompleted,
      engagementTrend: engagementTrend.slice(-14, -7)
    })
    
    // Calculate deltas
    const deltas = {
      membersTotal: ((current.membersTotal - previous.membersTotal) / previous.membersTotal) * 100,
      activeUsers: ((current.activeUsers - previous.activeUsers) / previous.activeUsers) * 100,
      messagesCount: ((current.messagesCount - previous.messagesCount) / previous.messagesCount) * 100,
      bountiesCompleted: ((current.bountiesCompleted - previous.bountiesCompleted) / Math.max(previous.bountiesCompleted, 1)) * 100
    }
    
    return { current, previous, deltas }
  },

  async listBounties(): Promise<Bounty[]> {
    await ensureSeeded()
    const bounties = await read<Bounty[]>('bounties') || []
    return [...bounties]
  },

  async createBounty(input: Pick<Bounty, "title" | "reward" | "deadline">): Promise<Bounty> {
    await ensureSeeded()
    const bounties = await read<Bounty[]>('bounties') || []
    const newBounty: Bounty = {
      id: (bounties.length + 1).toString(),
      title: input.title,
      reward: input.reward,
      status: "active",
      participants: 0,
      deadline: input.deadline,
      createdAt: new Date().toISOString()
    }
    
    const updatedBounties = [...bounties, newBounty]
    await write('bounties', updatedBounties)
    return newBounty
  },

  async updateBounty(id: string, patch: Partial<Bounty>, memberId?: string): Promise<Bounty> {
    await ensureSeeded()
    const bounties = await read<Bounty[]>('bounties') || []
    const index = bounties.findIndex(b => b.id === id)
    if (index === -1) {
      throw new Error(`Bounty with id ${id} not found`)
    }
    
    const updatedBounty = { ...bounties[index], ...patch }
    const updatedBounties = [...bounties]
    updatedBounties[index] = updatedBounty
    await write('bounties', updatedBounties)
    
    // If this is a completion, log it
    if (patch.status === 'completed') {
      const events = await read<Event[]>('events') || []
      const members = await read<Member[]>('members') || []
      // Use provided memberId or first member as fallback
      const actualMemberId = memberId || (members.length > 0 ? members[0].id : 'unknown')
      
      events.push({
        type: 'bounty_completed',
        memberId: actualMemberId,
        ts: new Date().toISOString(),
        metadata: { bountyId: id }
      })
      await write('events', events)
    }
    
    return updatedBounty
  },

  async deleteBounty(id: string): Promise<void> {
    await ensureSeeded()
    const bounties = await read<Bounty[]>('bounties') || []
    const filteredBounties = bounties.filter(b => b.id !== id)
    if (filteredBounties.length === bounties.length) {
      throw new Error(`Bounty with id ${id} not found`)
    }
    await write('bounties', filteredBounties)
  },

  async listMembers(): Promise<Member[]> {
    await ensureSeeded()
    const members = await read<Member[]>('members') || []
    return [...members]
  },

  async recentEvents(): Promise<Event[]> {
    await ensureSeeded()
    const events = await read<Event[]>('events') || []
    return [...events]
  }
}

// Helper functions for currency conversion and date handling
function toCents(amount: number | string | null): number {
  if (amount == null) return 0
  const n = typeof amount === "string" ? Number(amount) : amount
  return Math.round(n * 100)
}

function fromCents(cents: number): number {
  return Math.round((cents / 100) * 100) / 100
}

function dayKey(d: string | Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.toISOString().slice(0, 10)
}

async function getWindow(range: "7d" | "30d") {
  const days = range === "7d" ? 7 : 30
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - days)
  return { start: start.toISOString(), end: end.toISOString(), days }
}

// Supabase adapter with improved implementation
const supabaseAdapter: DataAdapter = {
  async getStats(range: "7d" | "30d"): Promise<Stats> {
    const sb = createServiceClient()
    const hubId = env.DEMO_HUB_ID
    const { start, end, days } = await getWindow(range)

    // Count members total
    const { count: membersTotal } = await sb
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("hub_id", hubId)

    // Active users = distinct member_id with any activity_logs OR bounty_events in window
    const [{ data: act }, { data: be }] = await Promise.all([
      sb.from("activity_logs").select("member_id,created_at").eq("hub_id", hubId).gte("created_at", start).lte("created_at", end),
      sb.from("bounty_events").select("member_id,created_at,status").eq("hub_id", hubId).gte("created_at", start).lte("created_at", end),
    ])
    const activeSet = new Set<string>()
    for (const r of act ?? []) if (r.member_id) activeSet.add(r.member_id)
    for (const r of be ?? []) if (r.member_id) activeSet.add(r.member_id)
    const activeUsers = activeSet.size

    // Messages = number of "posted" (or choose a type) in window
    const { count: messagesCount } = await sb
      .from("activity_logs")
      .select("*", { count: "exact", head: true })
      .eq("hub_id", hubId)
      .eq("type", "posted")
      .gte("created_at", start)
      .lte("created_at", end)

    // Bounties completed in window
    const { count: bountiesCompleted } = await sb
      .from("bounty_events")
      .select("*", { count: "exact", head: true })
      .eq("hub_id", hubId)
      .eq("status", "completed")
      .gte("created_at", start)
      .lte("created_at", end)

    // Trend = per-day sum of any activity (or choose posted only)
    const byDay: Record<string, number> = {}
    for (const r of act ?? []) {
      const k = dayKey(r.created_at)
      byDay[k] = (byDay[k] ?? 0) + 1
    }
    for (const r of be ?? []) {
      const k = dayKey(r.created_at)
      byDay[k] = (byDay[k] ?? 0) + 1
    }
    const trend: TrendPoint[] = []
    const cursor = new Date(start)
    const endD = new Date(end)
    while (cursor <= endD) {
      const k = dayKey(cursor)
      trend.push({ date: new Date(cursor).toISOString(), dau: byDay[k] ?? 0 })
      cursor.setDate(cursor.getDate() + 1)
    }

    return {
      membersTotal: membersTotal ?? 0,
      activeUsers,
      messagesCount: messagesCount ?? 0,
      bountiesCompleted: bountiesCompleted ?? 0,
      engagementTrend: trend,
    }
  },

  async getStatsWithDeltas(): Promise<{ current: Stats; previous: Stats; deltas: { membersTotal: number; activeUsers: number; messagesCount: number; bountiesCompleted: number } }> {
    const sb = createServiceClient()
    const hubId = env.DEMO_HUB_ID
    
    // Calculate date ranges
    const now = new Date()
    const currentStart = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000))
    const previousStart = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000))
    
    // Get all activity and bounty events for both periods
    const [{ data: allAct }, { data: allBe }] = await Promise.all([
      sb.from("activity_logs").select("member_id,created_at,type").eq("hub_id", hubId).gte("created_at", previousStart),
      sb.from("bounty_events").select("member_id,created_at,status").eq("hub_id", hubId).gte("created_at", previousStart),
    ])
    
    // Filter events for current period (last 7 days)
    const currentEvents = [
      ...((allAct ?? []).filter(r => new Date(r.created_at) >= currentStart)),
      ...((allBe ?? []).filter(r => new Date(r.created_at) >= currentStart))
    ]
    
    // Filter events for previous period (7-14 days ago)
    const previousEvents = [
      ...((allAct ?? []).filter(r => {
        const d = new Date(r.created_at)
        return d >= previousStart && d < currentStart
      })),
      ...((allBe ?? []).filter(r => {
        const d = new Date(r.created_at)
        return d >= previousStart && d < currentStart
      }))
    ]
    
    // Compute current period stats
    const currentBountiesCompleted = (allBe ?? []).filter(e => 
      new Date(e.created_at) >= currentStart && e.status === "completed"
    ).length
    const currentActiveMemberIds = new Set(currentEvents.map(e => e.member_id))
    const currentActiveUsers = currentActiveMemberIds.size
    const currentMessagesCount = (allAct ?? []).filter(e => 
      new Date(e.created_at) >= currentStart && e.type === "posted"
    ).length
    
    // Compute previous period stats
    const previousBountiesCompleted = (allBe ?? []).filter(e => {
      const d = new Date(e.created_at)
      return d >= previousStart && d < currentStart && e.status === "completed"
    }).length
    const previousActiveMemberIds = new Set(previousEvents.map(e => e.member_id))
    const previousActiveUsers = previousActiveMemberIds.size
    const previousMessagesCount = (allAct ?? []).filter(e => {
      const d = new Date(e.created_at)
      return d >= previousStart && d < currentStart && e.type === "posted"
    }).length
    
    // Get total members count
    const { count: membersTotal } = await sb
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("hub_id", hubId)
    
    // Compute engagementTrend from activity over last 30 days
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))
    const [{ data: trendAct }, { data: trendBe }] = await Promise.all([
      sb.from("activity_logs").select("created_at").eq("hub_id", hubId).gte("created_at", thirtyDaysAgo),
      sb.from("bounty_events").select("created_at").eq("hub_id", hubId).gte("created_at", thirtyDaysAgo),
    ])
    
    const byDay: Record<string, number> = {}
    for (const r of trendAct ?? []) {
      const k = dayKey(r.created_at)
      byDay[k] = (byDay[k] ?? 0) + 1
    }
    for (const r of trendBe ?? []) {
      const k = dayKey(r.created_at)
      byDay[k] = (byDay[k] ?? 0) + 1
    }
    const engagementTrend: TrendPoint[] = []
    const cursor = new Date(thirtyDaysAgo)
    while (cursor <= now) {
      const k = dayKey(cursor)
      engagementTrend.push({ date: new Date(cursor).toISOString(), dau: byDay[k] ?? 0 })
      cursor.setDate(cursor.getDate() + 1)
    }
    
    // Current period (last 7 days)
    const current = normalizeStats({
      membersTotal: membersTotal ?? 0,
      activeUsers: currentActiveUsers,
      messagesCount: currentMessagesCount,
      bountiesCompleted: currentBountiesCompleted,
      engagementTrend: engagementTrend.slice(-7)
    })
    
    // Previous period (7 days before that)
    const previous = normalizeStats({
      membersTotal: membersTotal ?? 0,
      activeUsers: previousActiveUsers,
      messagesCount: previousMessagesCount,
      bountiesCompleted: previousBountiesCompleted,
      engagementTrend: engagementTrend.slice(-14, -7)
    })
    
    // Calculate deltas
    const deltas = {
      membersTotal: previous.membersTotal > 0 
        ? ((current.membersTotal - previous.membersTotal) / previous.membersTotal) * 100 
        : 0,
      activeUsers: previous.activeUsers > 0 
        ? ((current.activeUsers - previous.activeUsers) / previous.activeUsers) * 100 
        : 0,
      messagesCount: previous.messagesCount > 0 
        ? ((current.messagesCount - previous.messagesCount) / previous.messagesCount) * 100 
        : 0,
      bountiesCompleted: previous.bountiesCompleted > 0 
        ? ((current.bountiesCompleted - previous.bountiesCompleted) / previous.bountiesCompleted) * 100 
        : 0
    }
    
    return { current, previous, deltas }
  },

  async listBounties(): Promise<Bounty[]> {
    const sb = createServiceClient()
    const hubId = env.DEMO_HUB_ID
    const { data: rows, error } = await sb
      .from("bounties")
      .select("*")
      .eq("hub_id", hubId)
      .order("created_at", { ascending: false })
    if (error) throw error

    // participants per bounty from bounty_events
    const { data: ev, error: evErr } = await sb
      .from("bounty_events")
      .select("bounty_id,status")
      .eq("hub_id", hubId)
    if (evErr) throw evErr
    const byBounty: Record<string, number> = {}
    for (const e of ev ?? []) {
      const bid = e.bounty_id as string
      byBounty[bid] = (byBounty[bid] ?? 0) + 1
    }

    return (rows ?? []).map((r) => {
      // Convert database record to new reward structure
      let reward: BountyReward
      switch (r.reward_type) {
        case "cash":
          reward = { type: "usd", amount: toCents(r.amount) }
          break
        case "points":
          reward = { type: "points", amount: r.amount }
          break
        case "badge":
          reward = { 
            type: "badge", 
            badge: { 
              name: r.badge_name, 
              icon: r.badge_icon,
              description: r.badge_description 
            } 
          }
          break
        default:
          // Fallback for old data without reward_type
          reward = { type: "usd", amount: toCents(r.amount) }
      }

      return {
        id: r.id,
        title: r.name,
        reward,
        status: (r.status as Bounty["status"]) ?? "active",
        participants: byBounty[r.id] ?? 0,
        deadline: r.ends_at ?? null,
        createdAt: r.created_at,
      }
    })
  },

  async createBounty(input: Pick<Bounty, "title" | "reward" | "deadline">): Promise<Bounty> {
    const sb = createServiceClient()
    const hubId = env.DEMO_HUB_ID
    
    // Prepare the database record based on reward type
    let dbRecord: any = {
      hub_id: hubId,
      name: input.title,
      description: null,
      status: "active",
      ends_at: input.deadline,
    }

    // Set reward-specific fields
    switch (input.reward.type) {
      case "usd":
        dbRecord.reward_type = "cash"
        dbRecord.amount = fromCents(input.reward.amount || 0)
        dbRecord.badge_name = null
        dbRecord.badge_icon = null
        dbRecord.badge_description = null
        break
      case "points":
        dbRecord.reward_type = "points"
        dbRecord.amount = input.reward.amount || 0
        dbRecord.badge_name = null
        dbRecord.badge_icon = null
        dbRecord.badge_description = null
        break
      case "badge":
        dbRecord.reward_type = "badge"
        dbRecord.amount = null
        dbRecord.badge_name = input.reward.badge?.name || null
        dbRecord.badge_icon = input.reward.badge?.icon || null
        dbRecord.badge_description = input.reward.badge?.description || null
        break
    }

    const { data, error } = await sb
      .from("bounties")
      .insert(dbRecord)
      .select("*")
      .single()
    
    if (error) throw error
    
    // Convert database record back to Bounty format
    let reward: BountyReward
    switch (data.reward_type) {
      case "cash":
        reward = { type: "usd", amount: toCents(data.amount) }
        break
      case "points":
        reward = { type: "points", amount: data.amount }
        break
      case "badge":
        reward = { 
          type: "badge", 
          badge: { 
            name: data.badge_name, 
            icon: data.badge_icon,
            description: data.badge_description 
          } 
        }
        break
      default:
        throw new Error(`Unknown reward type: ${data.reward_type}`)
    }

    return {
      id: data.id,
      title: data.name,
      reward,
      status: data.status,
      participants: 0,
      deadline: data.ends_at ?? null,
      createdAt: data.created_at,
    }
  },

  async updateBounty(id: string, patch: Partial<Bounty>, memberId?: string): Promise<Bounty> {
    const sb = createServiceClient()
    const upd: any = {}
    if (patch.title !== undefined) upd.name = patch.title
    if (patch.reward !== undefined) upd.amount = (patch.reward.amount ?? 0) / 100 // Convert from cents to dollars
    if (patch.status !== undefined) upd.status = patch.status
    if (patch.deadline !== undefined) upd.ends_at = patch.deadline
    const { data, error } = await sb
      .from("bounties")
      .update(upd)
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw error
    
    // If this is a completion, create a bounty_event
    if (patch.status === "completed") {
      const hubId = env.DEMO_HUB_ID
      try {
        // If no memberId provided, get the first member from the hub
        let actualMemberId = memberId
        if (!actualMemberId) {
          const { data: firstMember } = await sb
            .from("members")
            .select("id")
            .eq("hub_id", hubId)
            .limit(1)
            .single()
          actualMemberId = firstMember?.id
        }
        
        if (actualMemberId) {
          await sb.from("bounty_events").insert({
            hub_id: hubId,
            member_id: actualMemberId,
            bounty_id: id,
            status: "completed"
          })
        }
      } catch (error) {
        console.error("Failed to create bounty_event (non-fatal):", error)
        // Continue even if this fails
      }
    }
    
    return {
      id: data.id,
      title: data.name,
      reward: {
        type: "usd",
        amount: data.amount * 100, // Convert from dollars to cents
      },
      status: data.status,
      participants: 0, // optionally re-count like listBounties()
      deadline: data.ends_at ?? null,
      createdAt: data.created_at,
    }
  },

  async deleteBounty(id: string): Promise<void> {
    const sb = createServiceClient()
    const { error } = await sb
      .from("bounties")
      .delete()
      .eq("id", id)
    if (error) throw error
  },

  async listMembers(): Promise<Member[]> {
    const sb = createServiceClient()
    const hubId = env.DEMO_HUB_ID
    const { data, error } = await sb
      .from("members")
      .select("*")
      .eq("hub_id", hubId)
      .order("joined_at", { ascending: false })
    if (error) throw error
    return (data ?? []).map((m) => ({
      id: m.id,                       // uuid string
      username: m.whop_member_id ?? m.id, // no username column; reuse whop id
      joinedAt: m.joined_at,
      lastActiveAt: m.last_active_at ?? m.joined_at,
      messagesCount: 0,               // derive later if you log messages in activity_logs
      roles: [m.role ?? "member"],
    }))
  },

  async recentEvents(): Promise<Event[]> {
    const sb = createServiceClient()
    const hubId = env.DEMO_HUB_ID
    const { start } = await getWindow("30d")

    const [{ data: acts }, { data: bountyEv }] = await Promise.all([
      sb.from("activity_logs").select("member_id,type,created_at,meta").eq("hub_id", hubId).gte("created_at", start),
      sb.from("bounty_events").select("member_id,bounty_id,status,created_at").eq("hub_id", hubId).gte("created_at", start),
    ])

    const events = []
    for (const a of acts ?? []) {
      events.push({
        type: a.type,                 // e.g., "posted"
        memberId: a.member_id,
        ts: a.created_at,
        metadata: a.meta ?? {},
      })
    }
    for (const b of bountyEv ?? []) {
      events.push({
        type: b.status === "completed" ? "bounty_completed" : "bounty_event",
        memberId: b.member_id,
        ts: b.created_at,
        metadata: { bountyId: b.bounty_id, status: b.status },
      })
    }
    return events
  }
}

// Select adapter based on DATA_BACKEND environment variable
// In demo mode, always use whop-emulated adapter
const rawBackend = serverEnv.DATA_BACKEND ?? process.env.DATA_BACKEND ?? "file"
const effectiveBackend = DEMO_MODE ? "whop-emulated" : rawBackend

if (DEMO_MODE && !DEMO_HUB_ID) {
  console.warn("DEMO_MODE enabled but DEMO_HUB_ID missing")
}

const adapter =
  effectiveBackend === "db"
    ? supabaseAdapter
    : effectiveBackend === "whop"
    ? whopAdapter
    : effectiveBackend === "whop-emulated"
    ? whopEmulatedAdapter
    : mockAdapter

// Log which backend is active on server start
if (typeof window === "undefined") {
  const backendMap: Record<string, string> = {
    db: "Supabase",
    whop: "Whop API",
    "whop-emulated": "Whop Emulator",
    file: "File (Mock)",
  }
  const backendName = backendMap[effectiveBackend] || "File (Mock)"
  const modeNote = DEMO_MODE ? " (DEMO_MODE forced)" : ""
  console.log(`[Data Adapter] Using ${backendName} backend (DATA_BACKEND=${effectiveBackend}${modeNote})`)
}

export function getAdapter(): DataAdapter {
  return adapter
}

export { adapter }
