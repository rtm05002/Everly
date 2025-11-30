import { headers } from "next/headers"
import { Suspense } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { KpiCard } from "@/components/kpi-card"
import { EngagementChart } from "@/components/engagement-chart"
import { ActivityFeed } from "@/components/activity-feed"
import Loading from "./loading"
import { getSupabaseServer } from "@/lib/supabase-server"
import { pctDelta } from "@/lib/metrics"
import { fetchOverview } from "@/server/queries/overview"
import { OverviewPageClient } from "@/components/overview-page"
import { SectionHeader } from "@/components/dashboard/SectionHeader"
import { SyncWhopUnifiedButton } from "@/components/sources/SyncWhopUnifiedButton"
import { Card, CardHeader, CardBody } from "@/components/layout/Card"
import { LastSyncBadge } from "@/components/dashboard/LastSyncBadge"
import { Badge } from "@/components/ui/badge"
import { serverEnv, FEATURE_WHOP_SYNC, isDev, DEMO_MODE, DEMO_HUB_ID, features } from "@/lib/env.server"
import { getAdapter } from "@/server/data-adapter"
import type { Event, Stats } from "@/lib/types"

interface OverviewPageProps {
  searchParams?: Promise<{
    range?: string
  }>
}

async function getActivationRate(hubId: string | null, days: number = 7) {
  if (!hubId) return null

  try {
    const supa = getSupabaseServer()

    const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    const { data: newMembers } = await supa
      .from("members")
      .select("id, created_at")
      .eq("hub_id", hubId)
      .gte("created_at", daysAgo)

    if (!newMembers || newMembers.length === 0) return null

    const { data: defaultFlow } = await supa
      .from("onboarding_flows")
      .select("id")
      .eq("hub_id", hubId)
      .eq("is_default", true)
      .single()

    if (!defaultFlow) return null

    const { data: firstStep } = await supa
      .from("onboarding_steps")
      .select("id")
      .eq("flow_id", defaultFlow.id)
      .eq("hub_id", hubId)
      .order("order_index", { ascending: true })
      .limit(1)
      .single()

    if (!firstStep) return null

    const memberIds = newMembers.map((m) => m.id)
    const { data: completed } = await supa
      .from("onboarding_progress")
      .select("member_id, completed_at")
      .eq("hub_id", hubId)
      .eq("step_id", firstStep.id)
      .in("member_id", memberIds)
      .eq("status", "completed")
      .not("completed_at", "is", null)

    if (!completed) return null

    const activatedCount = completed.filter((comp) => {
      const member = newMembers.find((m) => m.id === comp.member_id)
      if (!member) return false
      const memberCreated = new Date(member.created_at).getTime()
      const stepCompleted = new Date(comp.completed_at!).getTime()
      const hoursDiff = (stepCompleted - memberCreated) / (1000 * 60 * 60)
      return hoursDiff <= 48
    }).length

    return {
      value:
        newMembers.length > 0
          ? Math.round((activatedCount / newMembers.length) * 100)
          : 0,
      activated: activatedCount,
      total: newMembers.length,
    }
  } catch (error) {
    console.error("Error calculating activation:", error)
    return null
  }
}

async function OverviewContent({ range, hubId, isDemo = false }: { range: string; hubId: string; isDemo?: boolean }) {
  const days = parseInt(range.replace("d", "")) || 7
  const adapter = getAdapter()

  const emptyStats: Stats = {
    membersTotal: 0,
    activeUsers: 0,
    messagesCount: 0,
    bountiesCompleted: 0,
    engagementTrend: [],
  }

  let currentStats: Stats = emptyStats
  let previousStats: Stats = emptyStats
  let statsLoaded = false
  let recentEvents: Event[] = []
  let docsCount = 0
  let lastSync: string | null = null

  const syncSummary: { enabled: boolean; message: string } = {
    enabled: FEATURE_WHOP_SYNC,
    message: "",
  }

  // For demo hub, skip adapter stats and use fetchOverview directly (it queries the same tables)
  const isDemoHub = hubId === DEMO_HUB_ID

  if (!isDemoHub) {
    try {
      const statsResponse = await adapter.getStatsWithDeltas()
      currentStats = statsResponse.current
      previousStats = statsResponse.previous
      statsLoaded = true
    } catch (error) {
      console.warn("overview:getStatsWithDeltas failed", error)
      try {
        // Use the selected range, defaulting to "7d" if invalid
        const rangeStr = range === "7d" || range === "30d" ? range : "7d"
        currentStats = await adapter.getStats(rangeStr as "7d" | "30d")
      } catch (fallbackError) {
        console.warn("overview:getStats fallback failed", fallbackError)
      }
    }

    try {
      recentEvents = await adapter.recentEvents()
    } catch (error) {
      console.warn("overview:recentEvents failed", error)
    }
  }

  if (hubId) {
    try {
      const overviewData = await fetchOverview(hubId, days)
      docsCount = overviewData.indexedDocs ?? 0
      lastSync = overviewData.lastSyncAt ?? null

      // For demo hub, always use fetchOverview data (it queries the same tables as chart/recent activity)
      // For non-demo, merge with adapter stats if available, otherwise use fetchOverview totals
      if (isDemoHub || !statsLoaded) {
        currentStats = {
          membersTotal: overviewData.totals.members,
          activeUsers: overviewData.totals.activeUsers,
          messagesCount: overviewData.totals.messages,
          bountiesCompleted: overviewData.totals.bountiesCompleted,
          engagementTrend: overviewData.trend.map((p) => ({ date: p.date, dau: p.value })),
        }
        previousStats = {
          membersTotal: overviewData.previousTotals.members,
          activeUsers: overviewData.previousTotals.activeUsers,
          messagesCount: overviewData.previousTotals.messages,
          bountiesCompleted: overviewData.previousTotals.bountiesCompleted,
          engagementTrend: [],
        }
        // Use recent events from fetchOverview for demo hub
        if (isDemoHub) {
          recentEvents = overviewData.recent
        }
      } else {
        // Override engagement trend with fetchOverview data to ensure correct range
        currentStats.engagementTrend = overviewData.trend.map((p) => ({ date: p.date, dau: p.value }))
      }
    } catch (error) {
      console.warn("overview:fetchOverview failed", error)
    }
  }

  if (!syncSummary.enabled) {
    syncSummary.message = isDev
      ? "Whop sync disabled via FEATURE_WHOP_SYNC (dev default is enabled)."
      : "Whop sync disabled by configuration."
  }

  let activation = null
  try {
    activation = await getActivationRate(hubId, days)
  } catch (error) {
    console.warn("overview:getActivationRate failed", error)
  }

  const stats = {
    membersTotal: currentStats.membersTotal,
    activeUsers: currentStats.activeUsers,
    messagesCount: currentStats.messagesCount,
    bountiesCompleted: currentStats.bountiesCompleted,
    engagementTrend: currentStats.engagementTrend ?? [],
  }

  const prevStats = {
    membersTotal: previousStats.membersTotal,
    activeUsers: previousStats.activeUsers,
    messagesCount: previousStats.messagesCount,
    bountiesCompleted: previousStats.bountiesCompleted,
    engagementTrend: previousStats.engagementTrend ?? [],
  }

  const hasData =
    stats.membersTotal > 0 ||
    stats.activeUsers > 0 ||
    stats.messagesCount > 0 ||
    stats.bountiesCompleted > 0
  const hasEngagementData =
    stats.engagementTrend &&
    stats.engagementTrend.length > 0 &&
    stats.engagementTrend.some((p) => p.dau > 0)
  const recentActivities = recentEvents.slice(0, 10)

  if (!hasData) {
    return (
      <DashboardLayout>
        <OverviewPageClient defaultRange={range}>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4 max-w-md">
              <div className="flex justify-center">
                <div className="rounded-full bg-primary/10 p-3">
                  <svg className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18 9h1.5a1 1 0 0 0 0-5H18"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 22h16" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 9H4.5a1 1 0 0 1 0-5H6"
                    />
                  </svg>
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">Welcome to your community dashboard</h2>
                <p className="text-muted-foreground">
                  Get started by creating your first bounty to engage your community members.
                </p>
              </div>

              <div className="space-y-2">
                <a
                  href="/bounties"
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18 9h1.5a1 1 0 0 0 0-5H18"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 22h16" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 9H4.5a1 1 0 0 1 0-5H6"
                    />
                  </svg>
                  Create your first bounty
                </a>
                <p className="text-xs text-muted-foreground">
                  Bounties help incentivize community participation and track engagement.
                </p>
              </div>
            </div>
          </div>
        </OverviewPageClient>
      </DashboardLayout>
    )
  }

  const membersCount = stats.membersTotal
  const active7d = stats.activeUsers
  const messagesCount = stats.messagesCount
  const bountiesCount = stats.bountiesCompleted
  const docsIndexed = docsCount
  const lastSyncAt = lastSync

  return (
    <DashboardLayout>
      <OverviewPageClient defaultRange={range}>
        <div className="space-y-6">
          {DEMO_MODE && (
            <div className="mb-3">
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 border border-amber-200">
                Demo Mode — showing sample data
              </span>
            </div>
          )}
          <SectionHeader
            title="Overview"
            subtitle={
              features.demoMode
                ? "Everly analyzes your community activity, content, and engagement to surface insights and power your AI answers."
                : "Everly analyzes your Whop community activity, content, and engagement to surface insights and power your AI answers."
            }
            right={
              <div className="flex items-center gap-2">
                <a
                  href="/ai-assistant"
                  className="px-3 py-1 rounded border hover:bg-zinc-50 dark:hover:bg-zinc-900 text-sm"
                >
                  Ask AI about your content
                </a>
                {features.whopSync ? (
                  <SyncWhopUnifiedButton hubId={hubId} />
                ) : (
                  <Badge variant="outline" className="text-xs">
                    {features.demoMode ? "Demo data (Whop sync disabled)" : "Whop sync disabled"}
                  </Badge>
                )}
              </div>
            }
            meta={
              <>
                {isDemo && <Badge tone="warning">Demo data</Badge>}
                {features.whopSync ? (
                  <LastSyncBadge isoDate={lastSyncAt} />
                ) : features.demoMode ? (
                  <Badge variant="outline" className="text-xs">Last sync: N/A (demo)</Badge>
                ) : null}
                {docsIndexed > 0 && <Badge tone="neutral">{docsIndexed} docs indexed</Badge>}
                {features.whopSync ? (
                  <Badge tone="neutral">Data source: Whop</Badge>
                ) : features.demoMode ? (
                  <Badge variant="outline" className="text-xs">Data source: Demo</Badge>
                ) : null}
                {!features.whopSync && !features.demoMode && syncSummary.message ? (
                  <Badge tone="warning">{syncSummary.message}</Badge>
                ) : null}
              </>
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(() => {
              const membersChange = pctDelta(stats.membersTotal, prevStats.membersTotal)
              const displayChange =
                prevStats.membersTotal === 0 && stats.membersTotal === 0 ? 0 : membersChange.delta
              return (
                <KpiCard
                  title="Total Members"
                  value={stats.membersTotal.toLocaleString()}
                  change={displayChange}
                  icon="Users"
                  trend={displayChange >= 0 ? "up" : "down"}
                />
              )
            })()}
            {(() => {
              const activeUsersChange = pctDelta(stats.activeUsers, prevStats.activeUsers)
              const displayChange =
                prevStats.activeUsers === 0 && stats.activeUsers === 0 ? 0 : activeUsersChange.delta
              return (
                <KpiCard
                  title="Active Users"
                  value={stats.activeUsers.toLocaleString()}
                  change={displayChange}
                  icon="TrendingUp"
                  trend={displayChange >= 0 ? "up" : "down"}
                />
              )
            })()}
            {(() => {
              const messagesChange = pctDelta(stats.messagesCount, prevStats.messagesCount)
              const displayChange =
                prevStats.messagesCount === 0 && stats.messagesCount === 0 ? 0 : messagesChange.delta
              return (
                <KpiCard
                  title="Messages"
                  value={stats.messagesCount.toLocaleString()}
                  change={displayChange}
                  icon="MessageSquare"
                  trend={displayChange >= 0 ? "up" : "down"}
                />
              )
            })()}
            {(() => {
              const bountiesChange = pctDelta(stats.bountiesCompleted, prevStats.bountiesCompleted)
              const displayChange =
                prevStats.bountiesCompleted === 0 && stats.bountiesCompleted === 0 ? 0 : bountiesChange.delta
              return (
                <KpiCard
                  title="Bounties Completed"
                  value={stats.bountiesCompleted.toLocaleString()}
                  change={displayChange}
                  icon="Trophy"
                  trend={displayChange >= 0 ? "up" : "down"}
                />
              )
            })()}
            {activation && (
              <KpiCard title="Activation" value={`${activation.value}%`} change={activation.activated} icon="CircleDot" trend="up" />
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <h2 className="text-lg font-medium">Engagement Trend</h2>
                <p className="text-sm text-muted-foreground">Daily active users over the last {days} days</p>
              </CardHeader>
              <CardBody>
                <EngagementChart data={hasEngagementData ? stats.engagementTrend : []} days={days} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <h2 className="text-lg font-medium">Recent Activity</h2>
                <p className="text-sm text-muted-foreground">Latest community updates</p>
              </CardHeader>
              <CardBody>
                <ActivityFeed activities={recentActivities} />
              </CardBody>
            </Card>
          </div>

          <div className="flex justify-end">
            <a href="/ai-assistant" className="text-sm underline hover:opacity-80 whitespace-nowrap">
              Ask AI about your content →
            </a>
          </div>
        </div>
      </OverviewPageClient>
    </DashboardLayout>
  )
}

export default async function OverviewPage({ searchParams }: OverviewPageProps) {
  const headerStore = await headers()
  // In demo mode, ALWAYS use DEMO_HUB_ID (ignore headers)
  const effectiveHubId = DEMO_MODE ? (DEMO_HUB_ID ?? null) : (headerStore.get("x-hub-id") ?? DEMO_HUB_ID ?? null)

  if (!effectiveHubId) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[320px] items-center justify-center px-6 text-center">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">No hub selected</h2>
            <p className="text-sm text-muted-foreground">
              We couldn&apos;t determine a hub context for this session.
              {isDev ? " In development, set NEXT_PUBLIC_DEV_HUB_ID or provide x-hub-id headers." : ""}
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const resolvedParams = await searchParams
  const range = resolvedParams?.range || "7d"

  return (
    <Suspense fallback={<Loading />}>
      <OverviewContent range={range} hubId={effectiveHubId} isDemo={DEMO_MODE && DEMO_HUB_ID === effectiveHubId} />
    </Suspense>
  )
}
