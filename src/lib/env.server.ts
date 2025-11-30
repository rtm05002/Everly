import { z } from 'zod'

const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE: z.string().optional(),
  DEMO_HUB_ID: z.string().optional(),
  DATA_BACKEND: z.enum(['file', 'db', 'whop', 'whop-emulated']).default('file'),
  FEATURE_WHOP_SYNC: z.string().optional(),
  WHOP_SYNC_ENABLED: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  JWT_SIGNING_SECRET: z.string().optional(),
  FEATURE_NUDGES: z.string().optional(),
  FEATURE_ONBOARDING: z.string().optional(),
  WHOP_WEBHOOK_SECRET: z.string().optional(),
  ADMIN_TASK_TOKEN: z.string().optional(),
  NUDGES_ENABLED: z.string().optional(),
  NUDGE_RATE_LIMIT_WINDOW_HOURS: z.string().optional(),
  NUDGE_MAX_RETRIES: z.string().optional(),
  WORKER_SECRET: z.string().optional(),
  WHOP_API_KEY: z.string().optional(),
  WHOP_ORG_ID: z.string().optional(),
  ENABLE_URL_FETCHER: z.string().optional(),
  EMBEDDING_MODEL: z.string().optional(),
  MAX_URL_PAGES: z.string().optional(),
  OPENAI_PROJECT: z.string().optional(),
  DEMO_MODE: z.string().optional(),
})

export const serverEnv = serverSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE,
  DEMO_HUB_ID: process.env.DEMO_HUB_ID,
  DATA_BACKEND: process.env.DATA_BACKEND,
  FEATURE_WHOP_SYNC: process.env.FEATURE_WHOP_SYNC,
  WHOP_SYNC_ENABLED: process.env.WHOP_SYNC_ENABLED,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  JWT_SIGNING_SECRET: process.env.JWT_SIGNING_SECRET,
  FEATURE_NUDGES: process.env.FEATURE_NUDGES,
  FEATURE_ONBOARDING: process.env.FEATURE_ONBOARDING,
  WHOP_WEBHOOK_SECRET: process.env.WHOP_WEBHOOK_SECRET,
  ADMIN_TASK_TOKEN: process.env.ADMIN_TASK_TOKEN,
  NUDGES_ENABLED: process.env.NUDGES_ENABLED,
  NUDGE_RATE_LIMIT_WINDOW_HOURS: process.env.NUDGE_RATE_LIMIT_WINDOW_HOURS,
  NUDGE_MAX_RETRIES: process.env.NUDGE_MAX_RETRIES,
  WORKER_SECRET: process.env.WORKER_SECRET,
  WHOP_API_KEY: process.env.WHOP_API_KEY,
  WHOP_ORG_ID: process.env.WHOP_ORG_ID,
  ENABLE_URL_FETCHER: process.env.ENABLE_URL_FETCHER,
  EMBEDDING_MODEL: process.env.EMBEDDING_MODEL,
  MAX_URL_PAGES: process.env.MAX_URL_PAGES,
  OPENAI_PROJECT: process.env.OPENAI_PROJECT,
  DEMO_MODE: process.env.DEMO_MODE,
})

export const env = serverEnv
export const isDev = serverEnv.NODE_ENV !== 'production'

export function toBool(value?: string, fallback = false) {
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase())
  }
  return fallback
}

export const FEATURE_WHOP_SYNC = toBool(
  serverEnv.FEATURE_WHOP_SYNC ?? serverEnv.WHOP_SYNC_ENABLED,
  isDev ? true : false,
)

export const DEMO_MODE = toBool(serverEnv.DEMO_MODE, false)
export const DEMO_HUB_ID = serverEnv.DEMO_HUB_ID ?? null

/**
 * Consolidated features object for easy access
 * whopSync: true if Whop sync is enabled (not in demo mode)
 * demoMode: true if running in demo mode
 */
export const features = {
  whopSync: FEATURE_WHOP_SYNC && !DEMO_MODE,
  demoMode: DEMO_MODE && !!DEMO_HUB_ID,
}

export function assertProdEnvReady() {
  if (serverEnv.NODE_ENV !== 'production') {
    return
  }

  const missing = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE']
    .filter((key) => !process.env[key])

  if (missing.length > 0) {
    console.error('Missing required env in production:', missing)
  }
}
