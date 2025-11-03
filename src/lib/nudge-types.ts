/**
 * Shared types for nudge delivery system
 */

export type NudgeStatus = 'queued' | 'sent' | 'failed' | 'skipped'

export interface NudgeLog {
  id: string
  hub_id: string
  member_id: string
  recipe_name: string
  channel: string
  message: string
  message_hash: string
  status: NudgeStatus
  error: string | null
  attempt: number
  scheduled_at: string
  sent_at: string | null
  created_at: string
  updated_at: string
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

