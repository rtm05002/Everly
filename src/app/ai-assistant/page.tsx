import { DashboardLayout } from "@/components/dashboard-layout"
import { loadAIConfig } from "./actions"
import { adapter } from "@/server/data-adapter"
import { evaluateNudges } from "@/lib/nudges"
import { AIAssistantCards } from "./ai-assistant-cards"
import { env } from "@/lib/env"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Database } from "lucide-react"

export default async function AIAssistantPage() {
  const initialConfig = await loadAIConfig()
  
  // Load data for nudge preview
  const [events, members] = await Promise.all([
    adapter.recentEvents(),
    adapter.listMembers()
  ])
  
  const nudges = evaluateNudges(initialConfig, events, members)

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-2">AI Assistant</h1>
            <p className="text-muted-foreground">Intelligent insights and automated engagement tools</p>
          </div>
          <Link href="/assistant/sources">
            <Button variant="outline">
              <Database className="h-4 w-4 mr-2" />
              Manage Sources
            </Button>
          </Link>
        </div>

        {/* Feature Cards */}
        <AIAssistantCards 
          initialConfig={initialConfig} 
          nudges={nudges} 
          hubId={env.DEMO_HUB_ID || ""} 
        />
      </div>
    </DashboardLayout>
  )
}
