import { DashboardLayout } from "@/components/dashboard-layout"
import { loadAIConfig } from "./actions"
import { adapter } from "@/server/data-adapter"
import { evaluateNudges } from "@/lib/nudges"
import { AIAssistantCards } from "./ai-assistant-cards"
import { DEMO_MODE, DEMO_HUB_ID, features } from "@/lib/env.server"
import SourcesPanel from "@/components/sources/SourcesPanel"
import { headers } from "next/headers"
import { Badge } from "@/components/ui/badge"

export default async function AIAssistantPage() {
  const headerStore = await headers()
  // In demo mode, ALWAYS use DEMO_HUB_ID (ignore headers)
  const effectiveHubId = DEMO_MODE ? (DEMO_HUB_ID ?? "") : (headerStore.get("x-hub-id") ?? DEMO_HUB_ID ?? "")
  const isDemo = DEMO_MODE && DEMO_HUB_ID === effectiveHubId

  const initialConfig = await loadAIConfig()

  const [events, members] = await Promise.all([
    adapter.recentEvents(),
    adapter.listMembers(),
  ])

  const nudges = evaluateNudges(initialConfig, events, members)

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {DEMO_MODE && (
          <div className="mb-3">
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 border border-amber-200">
              Demo Mode — showing sample data
            </span>
          </div>
        )}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                AI Assistant
              </h1>
            </div>
            <p className="text-muted-foreground">
              Intelligent insights and automated engagement tools
            </p>
          </div>
        </div>

        <AIAssistantCards
          initialConfig={initialConfig}
          nudges={nudges}
          hubId={effectiveHubId}
          isDemo={isDemo}
        />

        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Content Sources</h2>
            {features.whopSync ? (
              <a
                href="/assistant/sources"
                className="text-sm font-medium underline-offset-2 hover:underline"
              >
                Manage Sources
              </a>
            ) : isDemo ? (
              <span className="text-sm text-muted-foreground" title="Live Whop syncing will be available after you connect your Whop account.">
                View demo sources
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Datasets that power your AI answers. View details in the manager.
          </p>
          <div className="mt-4">
            <SourcesPanel mode="summary" hubId={effectiveHubId} isDemo={isDemo} whopSyncEnabled={features.whopSync} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
