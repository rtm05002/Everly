"use client"

import { useState, useEffect } from "react"
import type { NudgeLog, NudgeStatus } from "@/lib/nudge-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Search, Filter } from "lucide-react"

const PAGE_SIZE = 20

interface Filters {
  status?: string
  channel?: string
  search?: string
}

export default function AdminNudgeLogsPage() {
  const [logs, setLogs] = useState<NudgeLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [filters, setFilters] = useState<Filters>({})
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchLogs()
  }, [page, filters.status, filters.channel])

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      if (searchQuery !== filters.search) {
        setFilters(prev => ({ ...prev, search: searchQuery }))
        setPage(0)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  async function fetchLogs() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', PAGE_SIZE.toString())
      if (filters.status) params.set('status', filters.status)
      if (filters.channel) params.set('channel', filters.channel)
      if (filters.search) params.set('search', filters.search)

      const res = await fetch(`/api/admin/nudges/logs?${params.toString()}`)
      const data = await res.json()
      
      setLogs(data.logs || [])
      setHasMore(data.hasMore || false)
    } catch (err) {
      console.error('[admin:nudges] exception:', err)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }))
    setPage(0)
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Nudge Delivery Logs</h1>
        <p className="text-muted-foreground mt-2">Track all nudge delivery attempts</p>
      </div>

      {/* Filters */}
      <div className="mb-6 p-4 border rounded-lg space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium mb-3">
          <Filter className="h-4 w-4" />
          Filters
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members or recipes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Status filter */}
          <Select value={filters.status || ""} onValueChange={(v) => handleFilterChange('status', v)}>
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="skipped">Skipped</SelectItem>
            </SelectContent>
          </Select>

          {/* Channel filter */}
          <Select value={filters.channel || ""} onValueChange={(v) => handleFilterChange('channel', v)}>
            <SelectTrigger>
              <SelectValue placeholder="All channels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All channels</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="dm">Direct Message</SelectItem>
              <SelectItem value="announcement">Announcement</SelectItem>
              <SelectItem value="push">Push</SelectItem>
              <SelectItem value="webhook">Webhook</SelectItem>
              <SelectItem value="stub">Stub</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground">No logs found</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium text-sm">Status</th>
                  <th className="text-left p-3 font-medium text-sm">Recipe</th>
                  <th className="text-left p-3 font-medium text-sm">Member</th>
                  <th className="text-left p-3 font-medium text-sm">Channel</th>
                  <th className="text-left p-3 font-medium text-sm">Attempts</th>
                  <th className="text-left p-3 font-medium text-sm">Created</th>
                  <th className="text-left p-3 font-medium text-sm">Sent</th>
                  <th className="text-left p-3 font-medium text-sm">Error</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t hover:bg-muted/30">
                    <td className="p-3">
                      <Badge 
                        variant={
                          log.status === 'sent' ? 'default' : 
                          log.status === 'failed' ? 'destructive' : 
                          'secondary'
                        }
                        className={
                          log.status === 'sent' ? 'bg-green-100 text-green-800 border-green-200' :
                          log.status === 'failed' ? 'bg-red-100 text-red-800 border-red-200' :
                          log.status === 'queued' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                          ''
                        }
                      >
                        {log.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{log.recipe_name}</div>
                    </td>
                    <td className="p-3">
                      <div className="text-sm">
                        {log.member_name || log.member_id.slice(0, 8) + '...'}
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-xs">
                        {log.channel}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm">{log.attempt || log.attempts || 0}</td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {log.sent_at ? new Date(log.sent_at).toLocaleString() : '-'}
                    </td>
                    <td className="p-3">
                      {log.error && (
                        <div className="text-xs text-red-600 max-w-xs truncate" title={log.error}>
                          {log.error}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}–{page * PAGE_SIZE + logs.length}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0 || loading}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={!hasMore || loading}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
