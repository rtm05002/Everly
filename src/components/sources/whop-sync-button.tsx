"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { RefreshCw } from "lucide-react"

interface WhopSyncButtonProps {
  hubId: string
}

export function WhopSyncButton({ hubId }: WhopSyncButtonProps) {
  const [loading, setLoading] = React.useState(false)

  const handleSync = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/sync/whop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hubId }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Sync failed')
      }

      toast.success(`Sync complete: ${data.counts?.products || 0} products, ${data.counts?.members || 0} members`)
    } catch (err: any) {
      console.error('[Whop Sync Button] Error:', err)
      toast.error(err.message || 'Failed to sync')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleSync}
      disabled={loading}
    >
      {loading ? (
        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4 mr-2" />
      )}
      {loading ? 'Syncing...' : 'Sync Now'}
    </Button>
  )
}

