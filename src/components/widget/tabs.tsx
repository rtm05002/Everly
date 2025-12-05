"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

const tabs = [
  { id: "home", label: "Home" },
  { id: "challenges", label: "Challenges" },
  { id: "help", label: "Help" },
]

export function WidgetTabs() {
  const [activeTab, setActiveTab] = useState("home")

  return (
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
  )
}











