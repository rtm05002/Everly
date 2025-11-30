"use client"

import * as React from "react"
import { WhopSyncButton } from "@/components/sources/WhopSyncButton"

export function QuickActions({ hubId }: { hubId?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <WhopSyncButton kind="products" />
      <WhopSyncButton kind="announcements" />
      <a
        href="/ai-assistant"
        className="px-3 py-1 rounded border hover:bg-zinc-50 dark:hover:bg-zinc-900"
      >
        Ask AI about your content
      </a>
    </div>
  )
}

