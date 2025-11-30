import { createAdminClient } from "@/lib/supabase-admin"

type SafeLogParams = {
  hubId?: string
  memberId?: string
  kind: string
  tokensIn?: number
  tokensOut?: number
  latencyMs?: number
  meta?: any
}

/**
 * Best-effort AI logging helper. Any errors are swallowed.
 */
export async function safeLogAI({
  hubId,
  memberId,
  kind,
  tokensIn = 0,
  tokensOut = 0,
  latencyMs = 0,
  meta = {},
}: SafeLogParams) {
  try {
    const db = createAdminClient()
    await db.from("ai_logs").insert({
      hub_id: hubId ?? null,
      member_id: memberId ?? null,
      kind,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      latency_ms: latencyMs,
      meta,
    })
  } catch {
    // Intentionally swallow errors
  }
}

