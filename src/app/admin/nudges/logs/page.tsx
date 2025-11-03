import { Suspense } from 'react'
import type { NudgeLog, NudgeChannel, NudgeLogStatus } from '@/lib/nudge-types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getSupabaseServer } from '@/lib/supabase-server'

const STATUS: NudgeLogStatus[] = ['queued', 'sent', 'failed', 'skipped']
const CHANNELS: NudgeChannel[] = ['email', 'dm', 'announcement', 'push', 'webhook', 'stub']

async function getInitialLogs(): Promise<NudgeLog[]> {
  try {
    const supabase = getSupabaseServer()
    const { data, error } = await supabase
      .from('nudge_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (error) {
      console.error('[nudge logs] error:', error)
      return []
    }
    
    return (data as NudgeLog[]) || []
  } catch (err) {
    console.error('[nudge logs] exception:', err)
    return []
  }
}

function StatusPill({ status }: { status: NudgeLogStatus }) {
  const tone = status === 'sent' ? 'default'
    : status === 'failed' ? 'destructive'
    : status === 'skipped' ? 'secondary'
    : 'outline'
  
  const className = status === 'sent' ? 'bg-green-100 text-green-800 border-green-200'
    : status === 'failed' ? 'bg-red-100 text-red-800 border-red-200'
    : status === 'queued' ? 'bg-blue-100 text-blue-800 border-blue-200'
    : ''
    
  return <Badge variant={tone} className={className}>{status}</Badge>
}

export default async function Page() {
  const logs = await getInitialLogs()
  
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Nudge Delivery Logs</h1>
        <p className="text-muted-foreground mt-2">Track all nudge delivery attempts</p>
      </div>

      <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
        <ClientFilters initial={logs} />
      </Suspense>
    </div>
  )
}

// Client section
'use client'
import * as React from 'react'

function ClientFilters({ initial }: { initial: NudgeLog[] }) {
  const [items, setItems] = React.useState<NudgeLog[]>(initial)
  const [loading, setLoading] = React.useState(false)
  const [q, setQ] = React.useState('')
  const [status, setStatus] = React.useState<string>('')
  const [channel, setChannel] = React.useState<string>('')
  const [cursor, setCursor] = React.useState<string | null>(null)

  React.useEffect(() => {
    setCursor(items.length ? items[items.length - 1].created_at : null)
  }, [items])

  async function fetchLogs(reset = false) {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (status) params.set('status', status)
      if (channel) params.set('channel', channel)
      if (!reset && cursor) params.set('cursor', cursor)
      params.set('limit', '50')

      const res = await fetch(`/api/admin/nudges/logs?${params.toString()}`, { cache: 'no-store' })
      const json = await res.json()
      
      if (reset) {
        setItems(json.items || [])
      } else {
        setItems(prev => [...prev, ...(json.items || [])])
      }
      setCursor(json.nextCursor || null)
    } catch (err) {
      console.error('[nudge logs] fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Auto-fetch on filter change
  React.useEffect(() => {
    fetchLogs(true)
  }, [status, channel])

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 border rounded-lg">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search member or message…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            {STATUS.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={channel} onValueChange={setChannel}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Channels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            {CHANNELS.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => fetchLogs(true)} disabled={loading}>
          {loading ? 'Loading…' : 'Search'}
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground border-b">
            <tr>
              <th className="px-3 py-2 text-left">Time</th>
              <th className="px-3 py-2 text-left">Member</th>
              <th className="px-3 py-2 text-left">Recipe</th>
              <th className="px-3 py-2 text-left">Channel</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-center">Attempts</th>
              <th className="px-3 py-2 text-left w-[40%]">Message</th>
            </tr>
          </thead>
          <tbody>
            {items.map((n) => (
              <tr key={n.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 whitespace-nowrap text-xs">
                  {new Date(n.created_at).toLocaleString()}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="text-sm font-mono">
                    {n.member_name || n.member_id.slice(0, 8) + '...'}
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm">
                  {n.recipe_name}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <Badge variant="outline" className="text-xs">{n.channel}</Badge>
                </td>
                <td className="px-3 py-2">
                  <StatusPill status={n.status} />
                </td>
                <td className="px-3 py-2 text-center text-sm">
                  {n.attempts || n.attempt || 0}
                </td>
                <td className="px-3 py-2 text-muted-foreground text-xs truncate max-w-md">
                  {n.message_preview || n.message || '—'}
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  No logs yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Load more button */}
      <div className="flex justify-center">
        <Button 
          variant="outline" 
          onClick={() => fetchLogs(false)} 
          disabled={loading || !cursor}
        >
          {loading ? 'Loading…' : cursor ? 'Load more' : 'No more'}
        </Button>
      </div>
    </div>
  )
}
