"use client"

import * as React from "react"
import { DEMO_MODE } from "@/lib/env.client"

export function WhopSyncButton({
  kind = "products",
}: {
  kind?: "products" | "announcements" | "hub" | "posts"
}) {
  const [loading, setLoading] = React.useState(false)
  const [result, setResult] = React.useState<any>(null)

  async function onClick() {
    if (DEMO_MODE) return // Don't run in demo mode
    setLoading(true)
    try {
      const res = await fetch("/api/assistant/sources/whop/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      })
      const json = await res.json()
      setResult(json)
    } catch (err: any) {
      console.error("[WhopSyncButton] Error:", err)
      setResult({ ok: false, error: err.message || "Sync failed" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onClick}
        disabled={loading || DEMO_MODE}
        className="px-3 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed"
        title={DEMO_MODE ? "Requires live Whop connection (disabled in demo mode)" : undefined}
      >
        {loading ? "Syncing…" : DEMO_MODE ? "Requires live Whop connection (disabled in demo mode)" : `Sync Whop: ${kind}`}
      </button>
      {result?.ok && (
        <span className="text-xs text-muted-foreground">
          {result.source}: +{result.added ?? 0} / ~{result.count ?? 0} (updated{" "}
          {result.updated ?? 0}, skipped {result.skipped ?? 0})
        </span>
      )}
      {result && !result.ok && (
        <span className="text-xs text-destructive">
          Error: {result.error || "Unknown error"}
        </span>
      )}
    </div>
  )
}



