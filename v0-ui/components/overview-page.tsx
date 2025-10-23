"use client"

import { KpiCard } from "./kpi-card"
import { EngagementChart } from "./engagement-chart"
import { ActivityFeed } from "./activity-feed"
import { TrendingUp, Users, MessageSquare, Trophy, Calendar } from "lucide-react"
import { Button } from "./ui/button"

export function OverviewPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-2">Overview</h1>
          <p className="text-muted-foreground">Track your community's engagement and growth metrics</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <Calendar className="h-4 w-4" />
            Last 7 days
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard title="Total Members" value="12,483" change={12.5} icon={Users} trend="up" />
        <KpiCard title="Active Users" value="8,291" change={8.2} icon={TrendingUp} trend="up" />
        <KpiCard title="Messages" value="45,231" change={-3.1} icon={MessageSquare} trend="down" />
        <KpiCard title="Bounties Completed" value="234" change={18.7} icon={Trophy} trend="up" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <EngagementChart />
        </div>
        <div className="space-y-6">
          <ActivityFeed />
        </div>
      </div>
    </div>
  )
}
