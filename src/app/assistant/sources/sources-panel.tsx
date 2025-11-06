"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "sonner"
import { MoreVertical, RefreshCw, AlertCircle, Plus } from "lucide-react"
import type { SourceWithStats } from "@/lib/ai-index-types"
import { formatDistanceToNow } from "date-fns"

interface SourcesPanelProps {
  initialSources: SourceWithStats[]
  hubId: string
}

export function SourcesPanel({ initialSources, hubId }: SourcesPanelProps) {
  const [sources, setSources] = React.useState(initialSources)
  const [syncing, setSyncing] = React.useState<Set<string>>(new Set())
  const [loading, setLoading] = React.useState(false)

  // Refresh sources data
  const refreshSources = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/assistant/sources', {
        cache: 'no-store',
      })
      if (res.ok) {
        const data = await res.json()
        setSources(data)
      }
    } catch (err) {
      console.error('[Sources Panel] Refresh error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSync = async (sourceId: string) => {
    const source = sources.find(s => s.id === sourceId)
    if (!source) return

    setSyncing(prev => new Set(prev).add(sourceId))
    try {
      // Route to URL sync for URL sources, otherwise use regular sync
      const endpoint = source.kind === 'url' 
        ? `/api/assistant/sources/${sourceId}/url-sync`
        : `/api/assistant/sources/${sourceId}/sync`
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hub_id: hubId }),
      })
      
      const data = await res.json()
      
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Sync failed')
      }
      
      if (source.kind === 'url') {
        toast.success(`Indexed ${data.totalDocs || 0} docs, ${data.totalChunks || 0} chunks`)
      } else {
        toast.success('Sync started successfully')
      }
      
      await refreshSources()
    } catch (err: any) {
      toast.error(err.message || 'Failed to start sync')
    } finally {
      setSyncing(prev => {
        const next = new Set(prev)
        next.delete(sourceId)
        return next
      })
    }
  }

  const handleBackfill = async () => {
    try {
      const res = await fetch('/api/assistant/sources/backfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hub_id: hubId }),
      })
      
      if (!res.ok) {
        throw new Error('Backfill failed')
      }
      
      const data = await res.json()
      toast.success(`Verified ${data.verifiedChunks || 0} chunks`)
      await refreshSources()
    } catch (err) {
      toast.error('Failed to run backfill')
    }
  }

  // Empty state
  if (sources.length === 0) {
    return (
      <div className="card-elevated p-12 text-center">
        <div className="max-w-md mx-auto">
          <p className="text-lg font-medium mb-2">No sources yet</p>
          <p className="text-muted-foreground mb-6">
            Add content sources to power your AI assistant
          </p>
          <div className="flex gap-4 justify-center">
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Whop Source
            </Button>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add URL Source
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sources.map((source) => (
        <SourceCard
          key={source.id}
          source={source}
          isSyncing={syncing.has(source.id)}
          onSync={() => handleSync(source.id)}
          onBackfill={handleBackfill}
        />
      ))}
    </div>
  )
}

interface SourceCardProps {
  source: SourceWithStats
  isSyncing: boolean
  onSync: () => void
  onBackfill: () => void
}

function SourceCard({ source, isSyncing, onSync, onBackfill }: SourceCardProps) {
  const lastSyncTime = source.last_sync_finished_at
    ? formatDistanceToNow(new Date(source.last_sync_finished_at), { addSuffix: true })
    : 'Never'

  const statusVariant = source.last_sync_status === 'completed' ? 'default'
    : source.last_sync_status === 'failed' ? 'destructive'
    : source.last_sync_status === 'running' ? 'secondary'
    : 'outline'

  const hasError = source.last_sync_status === 'failed'
  const isEmpty = source.doc_count === 0 && source.last_sync_status === 'completed'

  return (
    <div className="card-elevated p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold">{source.name}</h3>
            <Badge variant="outline">{source.kind}</Badge>
            {hasError && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Last sync failed</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <span>{source.doc_count} docs</span>
            <span>{source.chunk_count} chunks</span>
            <span>Last sync: {lastSyncTime}</span>
          </div>
          {isEmpty && (
            <p className="text-sm text-muted-foreground mt-2 italic">
              Source synced but no content; check fetch filters
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sync Now
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => window.open(`/assistant/sources/logs?sourceId=${source.id}`, '_blank')}>
                View Sync Logs
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onBackfill}>
                Backfill/Verify Counts
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {source.last_sync_status && (
        <Badge variant={statusVariant} className="text-xs">
          {source.last_sync_status}
        </Badge>
      )}
    </div>
  )
}

