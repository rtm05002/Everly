"use client"

import { Search, Plus, Bell, Menu, Moon, Sun, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="relative flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search members, bounties, messages..."
                className="h-10 w-96 rounded-xl bg-secondary/50 pl-10 pr-4 text-sm outline-none ring-1 ring-transparent transition-all placeholder:text-muted-foreground focus:bg-secondary focus:ring-primary/30"
              />
            </div>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse-glow" />
            <span className="text-xs font-medium text-success">Live</span>
          </div>

          {mounted && (
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          )}

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive animate-pulse" />
          </Button>

          {/* Create button */}
          <Button className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30">
            <Plus className="mr-2 h-4 w-4" />
            Create
          </Button>

          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary/70 ring-2 ring-primary/20" />
        </div>
      </div>
    </header>
  )
}
