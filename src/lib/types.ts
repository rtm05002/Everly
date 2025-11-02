export interface Delta {
  value: number
  direction: "up" | "down"
}

export interface TrendPoint {
  date: string
  dau: number
}

export interface Stats {
  membersTotal: number
  activeUsers: number
  messagesCount: number
  bountiesCompleted: number
  engagementTrend: TrendPoint[]
}

export type RewardType = "usd" | "points" | "badge"

export interface BadgeReward {
  name: string
  icon: string
  description?: string
}

export interface BountyReward {
  type: RewardType
  amount?: number // For USD (in cents) or points
  badge?: BadgeReward // For badge rewards
}

export interface Bounty {
  id: string
  title: string
  reward: BountyReward
  status: "active" | "completed" | "archived"
  participants: number
  deadline: string | null
  createdAt: string
}

// AI Assistant Configuration Types
export type AIMode = "assist" | "moderate" | "proactive"

export type NudgeTrigger =
  | { type: "inactive_days"; gte: number }
  | { type: "viewed_bounty_not_completed"; withinHours: number }
  | { type: "near_deadline"; withinHours: number }
  | { type: "first_completion"; withinHours: number }
  | { type: "new_member_joined"; withinHours: number }
  | { type: "legacy"; trigger: string } // For backwards compatibility

export const COHORTS = ["New", "Lurker", "Champion"] as const
export type Cohort = (typeof COHORTS)[number]

export type NudgeTargeting = {
  tiers?: string[]
  cohorts?: Cohort[]
  tags?: string[]
}

export type NudgeFrequency = { 
  cooldown_days: number
  max_per_week: number 
}

export type NudgeDnd = { 
  start: string  // HH:mm format
  end: string    // HH:mm format
}

// Legacy NudgeRecipe interface for backwards compatibility
export interface NudgeRecipe {
  name: string
  trigger: string
  messageTemplate: string
  description?: string
}

// Enhanced NudgeRecipe interface with new features
export interface EnhancedNudgeRecipe {
  id?: string
  hub_id: string
  name: string
  trigger: NudgeTrigger
  targeting?: NudgeTargeting
  message_template: string
  channel?: "dm" | "email" | "webhook"
  frequency?: NudgeFrequency
  dnd?: NudgeDnd
  enabled?: boolean
  created_at?: string
  updated_at?: string
}

export interface AIConfig {
  mode: AIMode
  tone: "friendly" | "concise" | "enthusiastic"
  bannedPhrases: string[]
  escalateIf: string[]
  nudgeRecipes: NudgeRecipe[]
}

// Database schema types (internal use)
export interface DbBounty {
  id: string
  name: string
  amount: number
  status: "active" | "completed" | "archived"
  ends_at: string | null
  created_at: string
}

export interface DbBountyEvent {
  id: string
  bounty_id: string
  user_id: string
  status: "claimed" | "completed"
  created_at: string
}

export interface Member {
  id: string
  username: string
  joinedAt: string
  lastActiveAt: string
  messagesCount: number
  roles: string[]
}

export interface Event {
  type: "joined" | "posted" | "bounty_completed" | "streak_missed" | "announcement_received"
  memberId: string
  ts: string
  metadata?: Record<string, any>
}

export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
}

export interface ApiError {
  message: string
  code?: string
  status?: number
  details?: Record<string, any>
}

export function normalizeStats(raw: Partial<Stats>): Stats {
  return {
    membersTotal: raw.membersTotal ?? 0,
    activeUsers: raw.activeUsers ?? 0,
    messagesCount: raw.messagesCount ?? 0,
    bountiesCompleted: raw.bountiesCompleted ?? 0,
    engagementTrend: Array.isArray(raw.engagementTrend) ? raw.engagementTrend : [],
  }
}

// Mapping functions between frontend and database types
export function mapDbBountyToBounty(dbBounty: DbBounty, participants: number = 0): Bounty {
  return {
    id: dbBounty.id,
    title: dbBounty.name,
    rewardCents: dbBounty.amount * 100, // Convert from dollars to cents
    status: dbBounty.status,
    participants,
    deadline: dbBounty.ends_at,
    createdAt: dbBounty.created_at
  }
}

export function mapBountyToDbBounty(bounty: Bounty): DbBounty {
  return {
    id: bounty.id,
    name: bounty.title,
    amount: bounty.rewardCents / 100, // Convert from cents to dollars
    status: bounty.status,
    ends_at: bounty.deadline,
    created_at: bounty.createdAt
  }
}

// Onboarding Types
export type OnboardingStepKind = "read" | "post" | "join" | "connect" | "custom"

export interface OnboardingFlow {
  id?: string
  hub_id: string
  name: string
  description?: string | null
  audience?: { tiers?: string[]; cohorts?: ("New"|"Lurker"|"Champion")[] }
  is_default?: boolean
  enabled?: boolean
  created_at?: string
  updated_at?: string
}

export interface OnboardingStep {
  id?: string
  hub_id: string
  flow_id: string
  order_index: number
  title: string
  kind: OnboardingStepKind
  config?: Record<string, any>
  reward?: { type: "points" | "usd" | "badge"; amount?: number } | null
  nudge_recipe_id?: string | null
  created_at?: string
  updated_at?: string
}

export interface OnboardingProgress {
  id?: string
  hub_id: string
  member_id: string
  flow_id: string
  step_id: string
  status: "pending" | "started" | "completed" | "skipped"
  meta?: Record<string, any>
  completed_at?: string | null
  created_at?: string
}
