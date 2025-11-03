import { z } from 'zod'

const envSchema = z.object({
  DATA_BACKEND: z.enum(['file', 'db', 'whop', 'whop-emulated']).default('file'),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_JWT_SECRET: z.string().optional(),
  DEMO_HUB_ID: z.string().optional(),
  FEATURE_NUDGES: z.enum(['true', 'false']).default('true'),
  FEATURE_ONBOARDING: z.enum(['true', 'false']).default('false'),
  WHOP_WEBHOOK_SECRET: z.string().optional(),
  ADMIN_TASK_TOKEN: z.string().optional(),
  NUDGES_ENABLED: z.enum(['true', 'false']).default('false'),
  NUDGE_RATE_LIMIT_WINDOW_HOURS: z.string().optional(),
  NUDGE_MAX_RETRIES: z.string().optional(),
  WORKER_SECRET: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_PROJECT: z.string().optional(),
})

export const env = envSchema.parse({
  DATA_BACKEND: process.env.DATA_BACKEND,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET,
  DEMO_HUB_ID: process.env.DEMO_HUB_ID,
  FEATURE_NUDGES: process.env.FEATURE_NUDGES || 'true',
  FEATURE_ONBOARDING: process.env.FEATURE_ONBOARDING || 'false',
  WHOP_WEBHOOK_SECRET: process.env.WHOP_WEBHOOK_SECRET,
  ADMIN_TASK_TOKEN: process.env.ADMIN_TASK_TOKEN,
  NUDGES_ENABLED: process.env.NUDGES_ENABLED || 'false',
  NUDGE_RATE_LIMIT_WINDOW_HOURS: process.env.NUDGE_RATE_LIMIT_WINDOW_HOURS,
  NUDGE_MAX_RETRIES: process.env.NUDGE_MAX_RETRIES,
  WORKER_SECRET: process.env.WORKER_SECRET,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_PROJECT: process.env.OPENAI_PROJECT,
})
