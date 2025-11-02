"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { WidgetHome } from "./home"
import { WidgetChallenges } from "./challenges"
import { WidgetHelp } from "./help"
import { ErrorBoundary } from "@/components/ui/error-boundary"

import type { Bounty } from "@/lib/types"

interface WidgetContainerProps {
  hubId: string
  bounties: Bounty[]
}

const tabs = [
  { id: "home", label: "Home" },
  { id: "challenges", label: "Challenges" },
  { id: "help", label: "Help" },
]

export function WidgetContainer({ hubId, bounties }: WidgetContainerProps) {
  const [activeTab, setActiveTab] = useState("home")

  const renderTabContent = () => {
    switch (activeTab) {
      case "home":
        return <WidgetHome hubId={hubId} />
      case "challenges":
        return <WidgetChallenges hubId={hubId} bounties={bounties} />
      case "help":
        return <WidgetHelp hubId={hubId} />
      default:
        return <WidgetHome hubId={hubId} />
    }
  }

  return (
    <>
      {/* Tab Navigation */}
      <div className="border-b border-border">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
              aria-current={activeTab === tab.id ? "page" : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        <ErrorBoundary>
          {renderTabContent()}
        </ErrorBoundary>
      </div>
    </>
  )
}
