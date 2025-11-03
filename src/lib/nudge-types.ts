/**
 * Shared types for nudge delivery system
 */

export type NudgeLogStatus = 'queued' | 'sent' | 'failed' | 'skipped'
export type NudgeChannel = 'email' | 'dm' | 'announcement' | 'push' | 'webhook' | 'stub'

export interface NudgeLog {
  id: string
  hub_id: string
  recipe_id?: string | null
  recipe_name: string
  member_id: string
  member_name?: string | null
  channel: string
  message_preview?: string | null
  status: NudgeLogStatus
  attempts: number
  error: string | null
  sent_at: string | null
  created_at: string
  
  // Legacy fields (for backward compatibility with existing code)
  message?: string
  message_hash?: string
  attempt?: number
  scheduled_at?: string
  updated_at?: string
}

export interface NudgeQueueItem {
  id: string
  hub_id: string
  member_id: string
  recipe_name: string
  payload: {
    message: string
    variables?: Record<string, any>
    channel?: string
    metadata?: Record<string, any>
  }
  attempt: number
  available_at: string
  locked_at: string | null
  locked_by: string | null
  created_at: string
  updated_at: string
}

export interface EnqueueResult {
  enqueued: boolean
  reason?: 'rate_limited' | 'duplicate'
  queue_id?: string
  log_id?: string
}

export interface DispatchResult {
  ok: boolean
  enqueued: number
  skipped: number
  results: EnqueueResult[]
}

export interface WorkerResult {
  ok: boolean
  taken: number
  sent: number
  failed: number
  requeued: number
}

