import { getSupabaseServer } from "@/lib/supabase-server"
import { computeMessageHash } from "./template"
import type { EnqueueResult, NudgeQueueItem, NudgeLog } from "@/lib/nudge-types"
import { env } from "@/lib/env"

const getSupabase = () => getSupabaseServer()

/**
 * Bootstrap tables if they don't exist
 */
export async function ensureNudgeTables(): Promise<void> {
  try {
    // Tables should already exist from migration, but we check anyway
    const supabase = getSupabase()
    const { error } = await supabase
      .from('nudge_logs')
      .select('id')
      .limit(1)
    
    if (error && error.code === 'PGRST103') {
      console.warn('[nudge:db] nudge_logs table not found - please run migration')
    }
  } catch (err) {
    console.error('[nudge:db] failed to check tables:', err)
  }
}

/**
 * Enqueue a nudge for delivery
 */
export async function enqueueNudge(params: {
  hub_id: string
  member_id: string
  recipe_name: string
  message: string
  variables?: Record<string, any>
  channel?: string
}): Promise<EnqueueResult> {
  try {
    const supabase = getSupabase()
    
    // Compute message hash for idempotency
    const messageHash = computeMessageHash(params.message, params.variables || {}, params.recipe_name)
    
    // Rate limit check: look for any sent/queued nudges in the last N hours
    const windowHours = parseInt(env.NUDGE_RATE_LIMIT_WINDOW_HOURS || '6')
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString()
    
    const { data: recentLogs } = await supabase
      .from('nudge_logs')
      .select('status')
      .eq('hub_id', params.hub_id)
      .eq('member_id', params.member_id)
      .gte('scheduled_at', since)
      .in('status', ['queued', 'sent'])
    
    if (recentLogs && recentLogs.length > 0) {
      return { enqueued: false, reason: 'rate_limited' }
    }
    
    // Idempotency check: look for same message today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()
    
    const { data: duplicateLogs } = await supabase
      .from('nudge_logs')
      .select('id')
      .eq('hub_id', params.hub_id)
      .eq('member_id', params.member_id)
      .eq('recipe_name', params.recipe_name)
      .eq('message_hash', messageHash)
      .gte('scheduled_at', todayISO)
    
    if (duplicateLogs && duplicateLogs.length > 0) {
      return { enqueued: false, reason: 'duplicate' }
    }
    
    // Insert into queue
    const queuePayload = {
      message: params.message,
      variables: params.variables,
      channel: params.channel || 'stub',
      metadata: {},
    }
    
    const { data: queueRow, error: queueError } = await supabase
      .from('nudge_queue')
      .insert({
        hub_id: params.hub_id,
        member_id: params.member_id,
        recipe_name: params.recipe_name,
        payload: queuePayload,
      })
      .select()
      .single()
    
    if (queueError || !queueRow) {
      console.error('[nudge:db] failed to insert into queue:', queueError)
      return { enqueued: false }
    }
    
    // Insert log entry
    const { data: logRow, error: logError } = await supabase
      .from('nudge_logs')
      .insert({
        hub_id: params.hub_id,
        member_id: params.member_id,
        recipe_name: params.recipe_name,
        channel: params.channel || 'stub',
        message: params.message,
        message_hash: messageHash,
        status: 'queued',
      })
      .select()
      .single()
    
    if (logError) {
      console.error('[nudge:db] failed to insert into logs:', logError)
      // Don't fail the whole operation if log insert fails
    }
    
    return {
      enqueued: true,
      queue_id: queueRow.id,
      log_id: logRow?.id,
    }
  } catch (err) {
    console.error('[nudge:db] exception in enqueueNudge:', err)
    return { enqueued: false }
  }
}

/**
 * Try to dequeue a batch of nudges
 */
export async function tryDequeue(batchSize: number = 20, workerId: string): Promise<NudgeQueueItem[]> {
  try {
    const supabase = getSupabase()
    
    // Select available items
    const { data: candidates } = await supabase
      .from('nudge_queue')
      .select('*')
      .is('locked_at', null)
      .lte('available_at', new Date().toISOString())
      .limit(batchSize)
      .order('available_at', { ascending: true })
    
    if (!candidates || candidates.length === 0) {
      return []
    }
    
    const ids = candidates.map(c => c.id)
    
    // Lock them
    const { data: locked } = await supabase
      .from('nudge_queue')
      .update({
        locked_at: new Date().toISOString(),
        locked_by: workerId,
      })
      .in('id', ids)
      .select()
    
    return locked || []
  } catch (err) {
    console.error('[nudge:db] exception in tryDequeue:', err)
    return []
  }
}

/**
 * Mark a nudge as successfully delivered
 */
export async function markSuccess(queueId: string, logId?: string): Promise<void> {
  try {
    const supabase = getSupabase()
    
    // Remove from queue (or mark as processed)
    await supabase
      .from('nudge_queue')
      .delete()
      .eq('id', queueId)
    
    // Update log
    if (logId) {
      // Fetch current attempt value first
      const { data: currentLog } = await supabase
        .from('nudge_logs')
        .select('attempt')
        .eq('id', logId)
        .single()
      
      if (currentLog) {
        await supabase
          .from('nudge_logs')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            attempt: (currentLog.attempt || 0) + 1,
          })
          .eq('id', logId)
      }
    }
  } catch (err) {
    console.error('[nudge:db] exception in markSuccess:', err)
  }
}

/**
 * Mark a nudge as failed and schedule retry if applicable
 */
export async function markFailure(
  queueId: string,
  logId: string | undefined,
  error: string,
  maxRetries: number,
  attempt: number
): Promise<void> {
  try {
    const supabase = getSupabase()
    
    if (attempt + 1 >= maxRetries) {
      // Max retries reached - mark as failed
      if (logId) {
        await supabase
          .from('nudge_logs')
          .update({
            status: 'failed',
            error,
            attempt: attempt + 1,
          })
          .eq('id', logId)
      }
      
      // Remove from queue
      await supabase
        .from('nudge_queue')
        .delete()
        .eq('id', queueId)
    } else {
      // Schedule retry with exponential backoff
      const backoffMinutes = Math.pow(2, attempt)
      const nextAvailable = new Date(Date.now() + backoffMinutes * 60 * 1000)
      
      await supabase
        .from('nudge_queue')
        .update({
          available_at: nextAvailable.toISOString(),
          attempt: attempt + 1,
          locked_at: null,
          locked_by: null,
        })
        .eq('id', queueId)
      
      if (logId) {
        await supabase
          .from('nudge_logs')
          .update({
            attempt: attempt + 1,
            error,
          })
          .eq('id', logId)
      }
    }
  } catch (err) {
    console.error('[nudge:db] exception in markFailure:', err)
  }
}

/**
 * Get corresponding log entry for a queue item
 */
export async function getLogForQueue(queueId: string): Promise<NudgeLog | null> {
  try {
    const supabase = getSupabase()
    
    // Get queue item
    const { data: queueItem } = await supabase
      .from('nudge_queue')
      .select('hub_id, member_id, recipe_name')
      .eq('id', queueId)
      .single()
    
    if (!queueItem) {
      return null
    }
    
    // Find matching log
    const { data: logItem } = await supabase
      .from('nudge_logs')
      .select('*')
      .eq('hub_id', queueItem.hub_id)
      .eq('member_id', queueItem.member_id)
      .eq('recipe_name', queueItem.recipe_name)
      .eq('status', 'queued')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    return logItem as NudgeLog | null
  } catch (err) {
    console.error('[nudge:db] exception in getLogForQueue:', err)
    return null
  }
}

