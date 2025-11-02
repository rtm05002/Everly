import { WidgetContainer } from "@/components/widget/widget-container"
import { adapter } from "@/server/data-adapter"
import { env } from "@/lib/env"

interface WidgetPageProps {
  searchParams?: Promise<{
    hubId?: string
  }>
}

export default async function WidgetPage({ searchParams }: WidgetPageProps) {
  // Use the actual hubId from search params or fall back to DEMO_HUB_ID from env
  const resolvedParams = await searchParams
  const hubId = resolvedParams?.hubId || env.DEMO_HUB_ID || "demo"
  
  // Load bounties data at the server level
  // The adapter already filters by hub_id (via DEMO_HUB_ID env var or the actual hub)
  const allBounties = await adapter.listBounties()
  
  // Filter to only active bounties for the widget
  const bounties = allBounties.filter(b => b.status === "active")

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <div className="card-elevated rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-primary/5 border-b border-border p-6">
            <h1 className="text-2xl font-semibold text-foreground">
              Community Hub
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Hub ID: {hubId}
            </p>
          </div>

          {/* Widget Container with Tabs and Content */}
          <WidgetContainer hubId={hubId} bounties={bounties} />
        </div>
      </div>
    </div>
  )
}