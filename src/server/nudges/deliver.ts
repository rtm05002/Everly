import { defaultProvider } from "./provider"
import type { NudgeQueueItem } from "@/lib/nudge-types"

/**
 * Deliver a single nudge
 */
export async function deliverOne(jobRow: NudgeQueueItem): Promise<{ success: boolean; error?: string }> {
  try {
    const { payload } = jobRow
    
    const result = await defaultProvider.send({
      hubId: jobRow.hub_id,
      memberId: jobRow.member_id,
      channel: payload.channel || 'stub',
      message: payload.message,
      variables: payload.variables,
    })
    
    if (result.ok) {
      return { success: true }
    } else {
      return { success: false, error: result.error }
    }
  } catch (err) {
    console.error('[nudge:deliver] exception:', err)
    return { success: false, error: String(err) }
  }
}

