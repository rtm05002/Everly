"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { RefreshCw } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { DEMO_MODE } from "@/lib/env.client"

interface WhopSyncPanelProps {
  hubId: string
}

export function WhopSyncPanel({ hubId }: WhopSyncPanelProps) {
  const [loading, setLoading] = React.useState(false)
  const [fullSync, setFullSync] = React.useState(false)
  const [lastSync, setLastSync] = React.useState<{
    time: string
    status: string
    counts?: any
  } | null>(null)

  // Fetch last sync status on mount
  React.useEffect(() => {
    fetchLastSync()
  }, [])

  const fetchLastSync = async () => {
    // TODO: Fetch from /api/assistant/sources or similar
    // For now, just reset state
  }

  const handleSync = async () => {
    if (DEMO_MODE) return // Don't run in demo mode
    setLoading(true)
    try {
      const res = await fetch('/api/sync/whop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hubId, full: fullSync }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Sync failed')
      }

      toast.success(`Sync complete in ${(data.durationMs / 1000).toFixed(1)}s`)
      
      // Update last sync info
      setLastSync({
        time: new Date().toISOString(),
        status: 'completed',
        counts: data.counts,
      })
    } catch (err: any) {
      console.error('[Whop Sync Panel] Error:', err)
      toast.error(err.message || 'Failed to sync')
      
      setLastSync({
        time: new Date().toISOString(),
        status: 'failed',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card-elevated p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Whop Sync</h3>
          <p className="text-sm text-muted-foreground">
            Sync products, members, and content from Whop
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleSync}
          disabled={loading || DEMO_MODE}
          title={DEMO_MODE ? "Requires live Whop connection (disabled in demo mode)" : undefined}
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {loading ? 'Syncing...' : DEMO_MODE ? 'Requires live Whop connection (disabled in demo mode)' : 'Sync Now'}
        </Button>
      </div>

      {lastSync && (
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Last sync:</span>
            <span>{formatDistanceToNow(new Date(lastSync.time), { addSuffix: true })}</span>
          </div>
          {lastSync.counts && (
            <div className="text-muted-foreground">
              {lastSync.counts.products} products, {lastSync.counts.members} members, {lastSync.counts.docsUpserted} docs
            </div>
          )}
        </div>
      )}

      <div className="flex items-center space-x-2 mt-4">
        <Checkbox
          id="full-sync"
          checked={fullSync}
          onCheckedChange={(checked) => setFullSync(checked === true)}
        />
        <label
          htmlFor="full-sync"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Full sync (re-index all content)
        </label>
      </div>
    </div>
  )
}

