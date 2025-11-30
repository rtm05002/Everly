import { DashboardLayout } from "@/components/dashboard-layout"
import { getSourceStats } from "@/server/ai/content-index"
import { headers } from "next/headers"
import { SourcesPanel } from "./sources-panel"
import { WhopSyncPanel } from "@/components/sources/whop-sync-panel"
import { DEMO_MODE, DEMO_HUB_ID, features } from "@/lib/env.server"

export default async function SourcesPage() {
  const headerStore = await headers()
  // In demo mode, ALWAYS use DEMO_HUB_ID (ignore headers)
  const effectiveHubId = DEMO_MODE ? (DEMO_HUB_ID ?? "") : (headerStore.get("x-hub-id") ?? DEMO_HUB_ID ?? "")
  const isDemo = DEMO_MODE && DEMO_HUB_ID === effectiveHubId
  const sources = await getSourceStats(effectiveHubId)

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-2">
            Content Sources
          </h1>
          <p className="text-muted-foreground">
            Manage knowledge base sources for AI-powered responses
          </p>
        </div>

        {!features.whopSync && isDemo && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              You're viewing sample Everly data from a Whop community. Connect your Whop account to enable live syncing.
            </p>
          </div>
        )}

        {features.whopSync && <WhopSyncPanel hubId={effectiveHubId} />}
        <SourcesPanel 
          initialSources={sources} 
          hubId={effectiveHubId} 
          isDemo={isDemo}
          whopSyncEnabled={features.whopSync}
        />
      </div>
    </DashboardLayout>
  )
}

