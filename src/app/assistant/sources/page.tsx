import { DashboardLayout } from "@/components/dashboard-layout"
import { getSourceStats } from "@/server/ai/content-index"
import { env } from "@/lib/env"
import { SourcesPanel } from "./sources-panel"
import { WhopSyncPanel } from "@/components/sources/whop-sync-panel"

export default async function SourcesPage() {
  const hubId = env.DEMO_HUB_ID || ""
  const sources = await getSourceStats(hubId)

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

        <WhopSyncPanel hubId={hubId} />
        <SourcesPanel initialSources={sources} hubId={hubId} />
      </div>
    </DashboardLayout>
  )
}

