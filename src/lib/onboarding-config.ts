import { z } from "zod"
import { OnboardingStepKind } from "./types"

export const ReadConfig = z.object({
  url: z.string().refine(
    (val) => val.startsWith("http") || val.startsWith("/"),
    { message: "URL must start with http://, https://, or /" }
  ),
  cta: z.string().optional(),
})

export const JoinConfig = z.object({
  channels: z.array(z.string().uuid()).default([]),
  tier: z.string().uuid().optional(),
})

export const PostConfig = z.object({
  channel_id: z.string().uuid({ message: "Valid channel ID is required" }),
  prompt: z.string().optional(),
  min_words: z.number().int().min(0).default(0),
})

export const CustomConfig = z.object({
  bounty_id: z.string().uuid().optional(),
  webhook_url: z.string().url().optional(),
}).refine(
  (data) => {
    // Allow empty config initially, but require at least one field if any is provided
    const hasBounty = Boolean(data.bounty_id)
    const hasWebhook = Boolean(data.webhook_url)
    // If neither is set, that's ok (can be set later)
    // If at least one is set, validate the format
    if (!hasBounty && !hasWebhook) return true
    return hasBounty || hasWebhook
  },
  { message: "Either bounty_id or webhook_url must be provided" }
)

export const ConnectConfig = z.object({
  enable_mentions: z.boolean().default(true),
  enable_email: z.boolean().default(false),
  enable_dm: z.boolean().default(false),
})

export type ReadCfg = z.infer<typeof ReadConfig>
export type JoinCfg = z.infer<typeof JoinConfig>
export type PostCfg = z.infer<typeof PostConfig>
export type CustomCfg = z.infer<typeof CustomConfig>
export type ConnectCfg = z.infer<typeof ConnectConfig>

export function schemaFor(kind: OnboardingStepKind) {
  const schemas = {
    read: ReadConfig,
    join: JoinConfig,
    post: PostConfig,
    custom: CustomConfig,
    connect: ConnectConfig,
  }
  return schemas[kind]
}

export function validateConfig(kind: OnboardingStepKind, config: unknown) {
  const schema = schemaFor(kind)
  return schema.safeParse(config)
}

