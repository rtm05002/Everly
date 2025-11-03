/**
 * Lightweight logging helpers with optional Sentry integration
 * Never throws; safe to use anywhere
 */

export function logError(err: unknown, context?: Record<string, any>) {
  console.error('[error]', context, err)
  
  // Try to send to Sentry if available
  try {
    const Sentry = require('@sentry/nextjs')
    if (Sentry?.captureException) {
      Sentry.captureException(err, { extra: context })
    }
  } catch {
    // Sentry not available or failed; that's ok
  }
}

export function logInfo(msg: string, context?: Record<string, any>) {
  console.log('[info]', msg, context)
}

export function logWarning(msg: string, context?: Record<string, any>) {
  console.warn('[warning]', msg, context)
}

