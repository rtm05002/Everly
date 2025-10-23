"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Bot, Trophy, Users, TrendingUp, BarChart3, Settings, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

const navigationSections = [
  {
    title: "Core",
    items: [
      { name: "Overview", href: "/", icon: LayoutDashboard },
      { name: "AI Assistant", href: "/ai-assistant", icon: Bot },
      { name: "Bounties", href: "/bounties", icon: Trophy },
    ],
  },
  {
    title: "Insights",
    items: [
      { name: "Engagement", href: "/engagement", icon: TrendingUp },
      { name: "Analytics", href: "/analytics", icon: BarChart3 },
      { name: "Members", href: "/members", icon: Users },
    ],
  },
  {
    title: "Utilities",
    items: [{ name: "Settings", href: "/settings", icon: Settings }],
  },
]

export function Sidebar({ open }: { open: boolean }) {
  const pathname = usePathname()
  const [expandedSections, setExpandedSections] = useState<string[]>(["Core", "Insights"])

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => (prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]))
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen transition-all duration-300",
        open ? "w-64" : "w-0 -translate-x-full",
      )}
    >
      <div className="h-full bg-sidebar border-r border-sidebar-border p-6 flex flex-col">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold text-lg shadow-lg shadow-primary/20">
            E
          </div>
          <span className="text-xl font-semibold tracking-tight">Everly</span>
        </div>

        <nav className="space-y-6 flex-1 overflow-y-auto">
          {navigationSections.map((section) => {
            const isExpanded = expandedSections.includes(section.title)
            return (
              <div key={section.title}>
                <button
                  onClick={() => toggleSection(section.title)}
                  className="flex items-center justify-between w-full px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                >
                  {section.title}
                  <ChevronDown className={cn("h-3 w-3 transition-transform", isExpanded ? "rotate-180" : "")} />
                </button>

                {isExpanded && (
                  <div className="mt-2 space-y-1">
                    {section.items.map((item) => {
                      const isActive = pathname === item.href
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                            isActive
                              ? "bg-primary/10 text-primary shadow-sm"
                              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          )}
                        >
                          <item.icon className="h-5 w-5" strokeWidth={2} />
                          {item.name}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="mt-6 pt-6 border-t border-sidebar-border">
          <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 p-4 border border-primary/20">
            <p className="text-xs font-semibold text-foreground mb-1">Upgrade to Pro</p>
            <p className="text-xs text-muted-foreground mb-3">Advanced analytics & customizations</p>
            <button className="w-full rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm">
              Upgrade Now
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
