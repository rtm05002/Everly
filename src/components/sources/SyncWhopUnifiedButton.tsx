"use client"

import * as React from "react"
import { DEMO_MODE } from "@/lib/env.client"

type Kind = "products" | "announcements"

const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TASK_TOKEN || ""

type Status = {
  docs: number | null
  pendingEmbeddings: number | null
}

/**
 * Minimal wrapper that runs both product + announcement syncs in sequence.
 * Adds an optional embeddings backfill control for admins/creators.
 */
export function SyncWhopUnifiedButton({ hubId }: { hubId?: string }) {
  const [loading, setLoading] = React.useState(false)
  const [last, setLast] = React.useState<string | null>(null)
  const [backfilling, setBackfilling] = React.useState(false)
  const [{ docs, pendingEmbeddings }, setStatus] = React.useState<Status>({ docs: null, pendingEmbeddings: null })
  const [statusLoading, setStatusLoading] = React.useState(false)

  const fetchStatus = React.useCallback(async () => {
    if (!ADMIN_TOKEN) return
    setStatusLoading(true)
    try {
      const res = await fetch("/api/admin/embeddings/backfill", {
        headers: { "x-admin-token": ADMIN_TOKEN },
      })
      if (!res.ok) return
      const json = await res.json()
      setStatus({
        docs: json?.totals?.docs ?? null,
        pendingEmbeddings: json?.totals?.pendingEmbeddings ?? null,
      })
    } catch {
      // ignore status errors for now
    } finally {
      setStatusLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchStatus().catch(() => null)
  }, [fetchStatus])

  async function run() {
    if (DEMO_MODE) return // Don't run in demo mode
    setLoading(true)
    try {
      const kinds: Kind[] = ["products", "announcements"]
      for (const kind of kinds) {
        await fetch("/api/assistant/sources/whop/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(hubId ? { kind, hubId } : { kind }),
        }).catch(() => null)
      }
      setLast(new Date().toLocaleString())
      await fetchStatus()
    } finally {
      setLoading(false)
    }
  }

  async function backfill() {
    if (!ADMIN_TOKEN) {
      console.warn("Missing NEXT_PUBLIC_ADMIN_TASK_TOKEN")
      return
    }
    setBackfilling(true)
    try {
      await fetch("/api/admin/embeddings/backfill", {
        method: "POST",
        headers: { "x-admin-token": ADMIN_TOKEN },
      })
      await fetchStatus()
    } finally {
      setBackfilling(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={run}
        disabled={loading || DEMO_MODE}
        className="px-3 py-1 rounded border hover:bg-zinc-50 dark:hover:bg-zinc-900 disabled:opacity-50"
        title={DEMO_MODE ? "Requires live Whop connection (disabled in demo mode)" : undefined}
      >
        {loading ? "Syncing…" : DEMO_MODE ? "Requires live Whop connection (disabled in demo mode)" : "🔄 Sync Whop Content"}
      </button>
      <button
        onClick={backfill}
        disabled={backfilling || !ADMIN_TOKEN}
        className="px-3 py-1 rounded border hover:bg-zinc-50 dark:hover:bg-zinc-900 disabled:opacity-50"
      >
        {backfilling ? "Backfilling…" : "⚙️ Backfill embeddings"}
      </button>
      {last ? <span className="text-xs text-muted-foreground">Last synced: {last}</span> : null}
      <span className="text-xs text-muted-foreground">
        {statusLoading
          ? "Loading embedding status…"
          : `Docs: ${docs ?? "–"} • Pending embeddings: ${pendingEmbeddings ?? "–"}`}
      </span>
    </div>
  )
}


