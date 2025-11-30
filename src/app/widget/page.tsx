import HelpLauncherRoot from "@/components/widget/HelpLauncherRoot"
import { WidgetContainer } from "@/components/widget/widget-container"
import { adapter } from "@/server/data-adapter"
import { env } from "@/lib/env"
import { DEMO_MODE, DEMO_HUB_ID } from "@/lib/env.server"

interface WidgetPageProps {
  searchParams?: Promise<{
    hubId?: string
  }>
}

export default async function WidgetPage({ searchParams }: WidgetPageProps) {
  const resolvedParams = await searchParams
  // In demo mode, always use DEMO_HUB_ID (ignore search params)
  const hubId = DEMO_MODE && DEMO_HUB_ID ? DEMO_HUB_ID : (resolvedParams?.hubId || env.DEMO_HUB_ID || "demo")

  const allBounties = await adapter.listBounties()
  const bounties = allBounties.filter(b => b.status === "active")

  return (
    <div className="relative min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <div className="card-elevated rounded-2xl overflow-hidden">
          <div className="bg-primary/5 border-b border-border p-6">
            <h1 className="text-2xl font-semibold text-foreground">
              Community Hub
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Hub ID: {hubId}
            </p>
          </div>

          <WidgetContainer hubId={hubId} bounties={bounties} />
        </div>
      </div>

      <HelpLauncherRoot />
    </div>
  )
}