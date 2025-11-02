import { createServiceClient } from "@/server/db"
import { env } from "@/lib/env"
import type { SeriesPoint, TrendPoint } from "@/lib/types"
import type { Event } from "@/lib/types"

function dayKey(d: string | Date): string {
  const x = new Date(d)
  x.setUTCHours(0, 0, 0, 0)
  return x.toISOString().slice(0, 10)
}

export interface OverviewTotals {
  members: number
  activeUsers: number
  messages: number
  bountiesCompleted: number
}

export interface OverviewData {
  totals: OverviewTotals
  previousTotals: OverviewTotals
  trend: SeriesPoint[]
  recent: Event[]
}

/**
 * Fetch overview data for a specific date range
 * @param hubId - The hub ID to fetch data for
 * @param days - Number of days to look back (e.g., 7, 30, 60, 90)
 * @returns Overview data with totals, trend, and recent events
 */
export async function fetchOverview(hubId: string, days: number): Promise<OverviewData> {
  const sb = createServiceClient()
  const now = new Date()
  
  // Calculate date ranges
  const currentEnd = new Date(now)
  currentEnd.setUTCHours(23, 59, 59, 999)
  const currentStart = new Date(now)
  currentStart.setUTCDate(currentStart.getUTCDate() - days)
  currentStart.setUTCHours(0, 0, 0, 0)
  
  // Previous period (same length, before current period)
  const previousEnd = new Date(currentStart)
  previousEnd.setUTCMilliseconds(previousEnd.getUTCMilliseconds() - 1)
  const previousStart = new Date(previousEnd)
  previousStart.setUTCDate(previousStart.getUTCDate() - days)
  previousStart.setUTCHours(0, 0, 0, 0)

  // Fetch all data we need
  const [
    { count: membersTotal },
    { data: currentActLogs },
    { data: previousActLogs },
    { data: currentBountyEvents },
    { data: previousBountyEvents },
    { data: trendActLogs },
    { data: trendBountyEvents },
  ] = await Promise.all([
    // Total members count
    sb.from("members").select("*", { count: "exact", head: true }).eq("hub_id", hubId),
    
    // Current period activity logs
    sb
      .from("activity_logs")
      .select("member_id, created_at, type")
      .eq("hub_id", hubId)
      .gte("created_at", currentStart.toISOString())
      .lte("created_at", currentEnd.toISOString()),
    
    // Previous period activity logs
    sb
      .from("activity_logs")
      .select("member_id, created_at, type")
      .eq("hub_id", hubId)
      .gte("created_at", previousStart.toISOString())
      .lte("created_at", previousEnd.toISOString()),
    
    // Current period bounty events
    sb
      .from("bounty_events")
      .select("member_id, created_at, status, bounty_id")
      .eq("hub_id", hubId)
      .gte("created_at", currentStart.toISOString())
      .lte("created_at", currentEnd.toISOString()),
    
    // Previous period bounty events
    sb
      .from("bounty_events")
      .select("member_id, created_at, status, bounty_id")
      .eq("hub_id", hubId)
      .gte("created_at", previousStart.toISOString())
      .lte("created_at", previousEnd.toISOString()),
    
    // Trend data (for chart - need to go back `days` days)
    sb
      .from("activity_logs")
      .select("created_at")
      .eq("hub_id", hubId)
      .gte("created_at", currentStart.toISOString()),
    
    // Trend bounty events
    sb
      .from("bounty_events")
      .select("created_at")
      .eq("hub_id", hubId)
      .gte("created_at", currentStart.toISOString()),
  ])

  // Calculate current period totals
  const currentMessages = (currentActLogs || []).filter((e) => e.type === "posted").length
  const currentBountiesCompleted = (currentBountyEvents || []).filter(
    (e) => e.status === "completed"
  ).length
  const currentActiveMemberIds = new Set([
    ...(currentActLogs || []).map((e) => e.member_id),
    ...(currentBountyEvents || []).map((e) => e.member_id),
  ])

  // Calculate previous period totals
  const previousMessages = (previousActLogs || []).filter((e) => e.type === "posted").length
  const previousBountiesCompleted = (previousBountyEvents || []).filter(
    (e) => e.status === "completed"
  ).length
  const previousActiveMemberIds = new Set([
    ...(previousActLogs || []).map((e) => e.member_id),
    ...(previousBountyEvents || []).map((e) => e.member_id),
  ])

  // Build trend data - ensure exactly `days` points
  const byDay: Record<string, number> = {}
  for (const r of trendActLogs || []) {
    const k = dayKey(r.created_at)
    byDay[k] = (byDay[k] ?? 0) + 1
  }
  for (const r of trendBountyEvents || []) {
    const k = dayKey(r.created_at)
    byDay[k] = (byDay[k] ?? 0) + 1
  }

  const trend: SeriesPoint[] = []
  const cursor = new Date(currentStart)
  const endDate = new Date(currentEnd)
  while (cursor <= endDate) {
    const k = dayKey(cursor)
    trend.push({
      date: new Date(cursor).toISOString(),
      value: byDay[k] ?? 0,
    })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  // Get recent events for activity feed
  const recentActLogs = (currentActLogs || [])
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)

  const recentBountyEvents = (currentBountyEvents || [])
    .filter((e) => e.status === "completed")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)

  const recent: Event[] = [
    ...recentActLogs.map((e) => ({
      type: e.type as Event["type"],
      memberId: e.member_id,
      ts: e.created_at,
      metadata: {},
    })),
    ...recentBountyEvents.map((e) => ({
      type: "bounty_completed" as const,
      memberId: e.member_id,
      ts: e.created_at,
      metadata: { bountyId: e.bounty_id || "" },
    })),
  ].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()).slice(0, 10)

  return {
    totals: {
      members: membersTotal || 0,
      activeUsers: currentActiveMemberIds.size,
      messages: currentMessages,
      bountiesCompleted: currentBountiesCompleted,
    },
    previousTotals: {
      members: membersTotal || 0, // Members total doesn't change per period
      activeUsers: previousActiveMemberIds.size,
      messages: previousMessages,
      bountiesCompleted: previousBountiesCompleted,
    },
    trend,
    recent,
  }
}

