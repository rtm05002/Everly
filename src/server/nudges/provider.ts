/**
 * Nudge provider interface and implementations
 */

export type SendResult =
  | { ok: true }
  | { ok: false; error: string }

export interface NudgeProvider {
  send(opts: {
    hubId: string
    memberId: string
    channel: string
    message: string
    variables?: Record<string, any>
  }): Promise<SendResult>
}

/**
 * Stub provider that only logs messages (no real sending)
 */
export class StubNudgeProvider implements NudgeProvider {
  async send(opts: {
    hubId: string
    memberId: string
    channel: string
    message: string
    variables?: Record<string, any>
  }): Promise<SendResult> {
    try {
      console.log('[nudge:stub]', opts)
      return { ok: true }
    } catch (err) {
      console.error('[nudge:stub] error:', err)
      return { ok: false, error: String(err) }
    }
  }
}

/**
 * Default provider instance
 */
export const defaultProvider: NudgeProvider = new StubNudgeProvider()

