import { DashboardLayout } from "@/components/dashboard-layout"
import { KpiCard } from "@/components/kpi-card"
import { EngagementChart } from "@/components/engagement-chart"
import { ActivityFeed } from "@/components/activity-feed"
import { Button } from "@/components/ui/button"
import { adapter } from "@/server/data-adapter"
import { Suspense } from "react"
import Loading from "./loading"
import { env } from "@/lib/env"
import { getSupabaseServer } from "@/lib/supabase-server"
import { pctDelta } from "@/lib/metrics"
import { fetchOverview } from "@/server/queries/overview"
import { OverviewPageClient } from "@/components/overview-page"

async function getActivationRate() {
  if (!env.FEATURE_ONBOARDING) return null
  
  try {
    const supa = getSupabaseServer()
    const hubId = env.DEMO_HUB_ID
    
    // Get members who joined in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: newMembers } = await supa
      .from("members")
      .select("id, created_at")
      .eq("hub_id", hubId)
      .gte("created_at", sevenDaysAgo)
    
    if (!newMembers || newMembers.length === 0) return null
    
    // Get first step of default flow
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
    
    // Get completed progress within 48h for new members
    const memberIds = newMembers.map(m => m.id)
    const { data: completed } = await supa
      .from("onboarding_progress")
      .select("member_id, completed_at")
      .eq("hub_id", hubId)
      .eq("step_id", firstStep.id)
      .in("member_id", memberIds)
      .eq("status", "completed")
      .not("completed_at", "is", null)
    
    if (!completed) return null
    
    // Filter for completions within 48h of member creation
    const activatedCount = completed.filter(comp => {
      const member = newMembers.find(m => m.id === comp.member_id)
      if (!member) return false
      const memberCreated = new Date(member.created_at).getTime()
      const stepCompleted = new Date(comp.completed_at!).getTime()
      const hoursDiff = (stepCompleted - memberCreated) / (1000 * 60 * 60)
      return hoursDiff <= 48
    }).length
    
    return {
      value: newMembers.length > 0 
        ? Math.round((activatedCount / newMembers.length) * 100) 
        : 0,
      activated: activatedCount,
      total: newMembers.length
    }
  } catch (error) {
    console.error("Error calculating activation:", error)
    return null
  }
}

interface OverviewPageProps {
  searchParams?: Promise<{
    range?: string
  }>
}

async function OverviewContent({ range }: { range: string }) {
  // Parse range (7d, 30d, 60d, 90d)
  const days = parseInt(range.replace("d", "")) || 60
  const hubId = env.DEMO_HUB_ID
  
  if (!hubId) {
    throw new Error("DEMO_HUB_ID not configured")
  }

  // Fetch overview data for the specified range
  const overviewData = await fetchOverview(hubId, days)
  const activation = await getActivationRate()
  
  // Transform to Stats format for compatibility
  const stats = {
    membersTotal: overviewData.totals.members,
    activeUsers: overviewData.totals.activeUsers,
    messagesCount: overviewData.totals.messages,
    bountiesCompleted: overviewData.totals.bountiesCompleted,
    engagementTrend: overviewData.trend.map((p) => ({ date: p.date, dau: p.value })),
  }
  
  const prevStats = {
    membersTotal: overviewData.previousTotals.members,
    activeUsers: overviewData.previousTotals.activeUsers,
    messagesCount: overviewData.previousTotals.messages,
    bountiesCompleted: overviewData.previousTotals.bountiesCompleted,
    engagementTrend: [],
  }
  
  const recentEvents = overviewData.recent
  
  // Check if we have any data at all
  const hasData = stats.membersTotal > 0 || stats.activeUsers > 0 || stats.messagesCount > 0 || stats.bountiesCompleted > 0
  const hasEngagementData = stats.engagementTrend && stats.engagementTrend.length > 0 && stats.engagementTrend.some((p) => p.dau > 0)

  // If no data exists, show empty state
  if (!hasData) {
    return (
      <DashboardLayout>
        <OverviewPageClient defaultRange={range}>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4 max-w-md">
              <div className="flex justify-center">
                <div className="rounded-full bg-primary/10 p-3">
                  <svg className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9h1.5a1 1 0 0 0 0-5H18" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 22h16" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9H4.5a1 1 0 0 1 0-5H6" />
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
                <Button asChild className="gap-2">
                  <a href="/bounties">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9h1.5a1 1 0 0 0 0-5H18" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 22h16" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9H4.5a1 1 0 0 1 0-5H6" />
                    </svg>
                    Create your first bounty
                  </a>
                </Button>
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

  return (
    <DashboardLayout>
      <OverviewPageClient defaultRange={range}>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {(() => {
            const membersChange = pctDelta(stats.membersTotal, prevStats.membersTotal)
            // Never show -100% unless previous was non-zero
            const displayChange = prevStats.membersTotal === 0 && stats.membersTotal === 0 
              ? 0 
              : membersChange.delta
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
            const displayChange = prevStats.activeUsers === 0 && stats.activeUsers === 0 
              ? 0 
              : activeUsersChange.delta
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
            const displayChange = prevStats.messagesCount === 0 && stats.messagesCount === 0 
              ? 0 
              : messagesChange.delta
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
            const displayChange = prevStats.bountiesCompleted === 0 && stats.bountiesCompleted === 0 
              ? 0 
              : bountiesChange.delta
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
            <KpiCard 
              title="Activation" 
              value={`${activation.value}%`}
              change={activation.activated}
              icon="CircleDot"
              trend="up"
            />
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <EngagementChart 
              data={hasEngagementData ? stats.engagementTrend : []}
              days={days}
            />
          </div>
          <div className="space-y-6">
            <ActivityFeed activities={recentEvents} />
          </div>
        </div>
      </OverviewPageClient>
    </DashboardLayout>
  )
}

export default async function OverviewPage({ searchParams }: OverviewPageProps) {
  const resolvedParams = await searchParams
  const range = resolvedParams?.range || "60d"
  
  return (
    <Suspense fallback={<Loading />}>
      <OverviewContent range={range} />
    </Suspense>
  )
}
