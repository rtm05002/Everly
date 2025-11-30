function toBool(value?: string, fallback = true) {
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase())
  }
  return fallback
}

export const clientEnv = {
  NEXT_PUBLIC_FEATURE_CREATOR_CHAT: process.env.NEXT_PUBLIC_FEATURE_CREATOR_CHAT ?? 'true',
  NEXT_PUBLIC_FEATURE_MEMBER_CHAT: process.env.NEXT_PUBLIC_FEATURE_MEMBER_CHAT ?? 'true',
  NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE ?? 'false',
}

export const PUBLIC_FEATURES = {
  creatorChat: toBool(clientEnv.NEXT_PUBLIC_FEATURE_CREATOR_CHAT, true),
  memberChat: toBool(clientEnv.NEXT_PUBLIC_FEATURE_MEMBER_CHAT, true),
}

export const DEMO_MODE = toBool(clientEnv.NEXT_PUBLIC_DEMO_MODE, false)

