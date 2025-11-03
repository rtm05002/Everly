import { getSupabaseServer } from "@/lib/supabase-server"
import type { NudgeLogStatus, NudgeChannel } from '@/lib/nudge-types'

/**
 * Write a nudge log entry for observability
 */
export async function writeNudgeLog(input: {
  hub_id: string
  recipe_id?: string | null
  recipe_name: string
  member_id: string
  member_name?: string | null
  channel: NudgeChannel
  message_preview?: string | null
  status: NudgeLogStatus
  attempts?: number
  error?: string | null
  sent_at?: string | null
}): Promise<void> {
  try {
    const supabase = getSupabaseServer()
    
    // Try to insert, but don't throw on errors (fire-and-forget)
    const { error } = await supabase.from('nudge_logs').insert({
      ...input,
      attempts: input.attempts ?? 0,
      message_preview: input.message_preview ?? null,
      error: input.error ?? null,
      sent_at: input.sent_at ?? null,
    })
    
    if (error) {
      console.error('[nudge-logger] failed to write log:', error.message)
    }
  } catch (err) {
    console.error('[nudge-logger] exception writing log:', err)
  }
}

