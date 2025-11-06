"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus } from "lucide-react"
import { toast } from "sonner"

interface AddSourceDialogProps {
  hubId: string
  kind: 'url' | 'whop_product' | 'whop_forum'
  onSuccess?: () => void
  children?: React.ReactNode
}

export function AddSourceDialog({ hubId, kind, onSuccess, children }: AddSourceDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [formData, setFormData] = React.useState({
    name: '',
    start_urls: '',
    allow_patterns: '',
    deny_patterns: '',
    max_pages: '15',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const settings: any = {}
      
      if (kind === 'url') {
        const urls = formData.start_urls.split('\n').filter(u => u.trim())
        if (urls.length === 0) {
          toast.error('Please provide at least one start URL')
          return
        }
        settings.start_urls = urls
        if (formData.allow_patterns) {
          settings.allow_patterns = formData.allow_patterns.split('\n').filter(p => p.trim())
        }
        if (formData.deny_patterns) {
          settings.deny_patterns = formData.deny_patterns.split('\n').filter(p => p.trim())
        }
        if (formData.max_pages) {
          settings.max_pages = parseInt(formData.max_pages) || 15
        }
      }

      const res = await fetch('/api/assistant/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hub_id: hubId,
          kind,
          name: formData.name,
          settings,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create source')
      }

      toast.success('Source created successfully')
      setOpen(false)
      setFormData({
        name: '',
        start_urls: '',
        allow_patterns: '',
        deny_patterns: '',
        max_pages: '15',
      })
      onSuccess?.()
    } catch (err: any) {
      toast.error(err.message || 'Failed to create source')
    } finally {
      setLoading(false)
    }
  }

  const title = kind === 'url' ? 'Add URL Source' : kind === 'whop_product' ? 'Add Whop Product' : 'Add Whop Forum'
  const description = kind === 'url' 
    ? 'Crawl and index content from external websites'
    : 'Sync content from Whop'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            {title}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="My Documentation Site"
              required
            />
          </div>

          {kind === 'url' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="start_urls">Start URLs * (one per line)</Label>
                <Textarea
                  id="start_urls"
                  value={formData.start_urls}
                  onChange={(e) => setFormData({ ...formData, start_urls: e.target.value })}
                  placeholder="https://example.com/docs&#10;https://example.com/guides"
                  rows={4}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  URLs to start crawling from. The crawler will follow same-origin links.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="allow_patterns">Allow Patterns (optional, one per line)</Label>
                <Textarea
                  id="allow_patterns"
                  value={formData.allow_patterns}
                  onChange={(e) => setFormData({ ...formData, allow_patterns: e.target.value })}
                  placeholder="^https://example.com/docs&#10;^https://example.com/guides"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Regex patterns for URLs to include. If empty, all same-origin URLs are allowed.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deny_patterns">Deny Patterns (optional, one per line)</Label>
                <Textarea
                  id="deny_patterns"
                  value={formData.deny_patterns}
                  onChange={(e) => setFormData({ ...formData, deny_patterns: e.target.value })}
                  placeholder="\\?print=&#10;/admin/"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Regex patterns for URLs to exclude.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_pages">Max Pages (optional)</Label>
                <Input
                  id="max_pages"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.max_pages}
                  onChange={(e) => setFormData({ ...formData, max_pages: e.target.value })}
                  placeholder="15"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum number of pages to crawl per sync (default: 15, max: 100).
                </p>
              </div>
            </>
          )}

          {kind !== 'url' && (
            <p className="text-sm text-muted-foreground">
              Whop source configuration will be available soon.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Source'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

