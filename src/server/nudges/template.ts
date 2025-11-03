import crypto from 'crypto'

/**
 * Render a template with variables
 * Simple {{variable}} replacement
 */
export function renderTemplate(tpl: string, vars: Record<string, any> = {}): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = vars[key]
    return value !== undefined && value !== null ? String(value) : ''
  })
}

/**
 * Compute a hash for a message to ensure idempotency
 */
export function computeMessageHash(message: string, variables: Record<string, any>, recipeName: string): string {
  const payload = JSON.stringify({ message, variables, recipeName })
  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex')
}

