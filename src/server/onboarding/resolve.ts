import { OnboardingStep } from "@/lib/types"

export interface Event {
  type: string
  meta?: any
  member_id: string
  created_at: string
}

function normalizeUrl(url: string | undefined): string | null {
  if (!url) return null
  // Remove protocol, trailing slash, and normalize
  return url
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "")
    .toLowerCase()
}

/**
 * Evaluates whether a step should be marked as completed based on an event
 */
export async function evaluateStepCompletion(
  step: OnboardingStep,
  event: Event
): Promise<boolean> {
  if (!step.config || !step.kind) return false

  const config = step.config

  switch (step.kind) {
    case "post":
      return (
        event.type === "post" &&
        event.meta?.channel_id === config.channel_id
      )

    case "join":
      if (event.type !== "join") return false
      const channels = Array.isArray(config.channels) ? config.channels : []
      return channels.includes(event.meta?.channel_id)

    case "read":
      if (event.type !== "view") return false
      const eventUrl = normalizeUrl(event.meta?.url)
      const stepUrl = normalizeUrl(config.url)
      return eventUrl === stepUrl

    case "custom":
      if (config.bounty_id) {
        return (
          event.type === "bounty.completed" &&
          event.meta?.bounty_id === config.bounty_id
        )
      }
      if (config.webhook_url) {
        // Webhook steps are manual or triggered by external system
        return event.type === "webhook.triggered" &&
          event.meta?.webhook_url === config.webhook_url
      }
      return false

    case "connect":
      if (event.type !== "settings.updated") return false
      if (config.enable_mentions && event.meta?.mentions_enabled) return true
      if (config.enable_email && event.meta?.email_enabled) return true
      if (config.enable_dm && event.meta?.dm_enabled) return true
      return false

    default:
      return false
  }
}

/**
 * Backfill onboarding progress for a flow by evaluating existing members' recent activity
 */
export async function backfillFlowProgress(
  hubId: string,
  flowId: string
): Promise<{ completed: number; checked: number; errors: string[] }> {
  const { createClient } = await import("@supabase/supabase-js")
  const supa = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!)

  const errors: string[] = []

  try {
    // Get all steps for this flow
    const { data: steps, error: stepsError } = await supa
      .from("onboarding_steps")
      .select("*")
      .eq("hub_id", hubId)
      .eq("flow_id", flowId)
      .order("order_index", { ascending: true })

    if (stepsError || !steps || steps.length === 0) {
      return { completed: 0, checked: 0, errors: ["No steps found for flow"] }
    }

    // Get all members in the hub
    const { data: members, error: membersError } = await supa
      .from("members")
      .select("id")
      .eq("hub_id", hubId)

    if (membersError || !members || members.length === 0) {
      return { completed: 0, checked: 0, errors: ["No members found"] }
    }

    let completedCount = 0
    const checkedCount = members.length

    // For each member, check their recent activity (30-60 days)
    const daysToCheck = 45 // Middle ground between 30-60
    const cutoffDate = new Date(Date.now() - daysToCheck * 24 * 60 * 60 * 1000).toISOString()

    for (const member of members) {
      try {
        // Get recent activity from activity_logs
        const { data: activities } = await supa
          .from("activity_logs")
          .select("type, meta, created_at")
          .eq("hub_id", hubId)
          .eq("member_id", member.id)
          .gte("created_at", cutoffDate)
          .order("created_at", { ascending: false })
          .limit(200)

        // Get bounty completions
        const { data: bountyEvents } = await supa
          .from("bounty_events")
          .select("bounty_id, created_at")
          .eq("hub_id", hubId)
          .eq("member_id", member.id)
          .eq("status", "completed")
          .gte("created_at", cutoffDate)

        // Convert bounty events to activity format
        const bountyActivities = (bountyEvents || []).map((be) => ({
          type: "bounty.completed",
          meta: { bounty_id: be.bounty_id },
          created_at: be.created_at,
        }))

        const allEvents = [...(activities || []), ...bountyActivities]

        // Check each step against member's events
        for (const step of steps as OnboardingStep[]) {
          // Check if member already has completed progress for this step
          const { data: existing } = await supa
            .from("onboarding_progress")
            .select("id, status")
            .eq("hub_id", hubId)
            .eq("member_id", member.id)
            .eq("step_id", step.id)
            .single()

          // Skip if already completed
          if (existing && existing.status === "completed") continue

          // Check each event to see if it matches this step
          let stepCompleted = false
          let completedAt: string | null = null

          for (const activity of allEvents) {
            const eventData: Event = {
              type: activity.type,
              meta: activity.meta || {},
              member_id: member.id,
              created_at: activity.created_at,
            }

            const matches = await evaluateStepCompletion(step, eventData)

            if (matches) {
              stepCompleted = true
              completedAt = activity.created_at
              break // Use first matching event's timestamp
            }
          }

          if (stepCompleted && step.id) {
            // Upsert progress as completed
            const { error: upsertError } = await supa.from("onboarding_progress").upsert(
              {
                hub_id: hubId,
                member_id: member.id,
                flow_id: flowId,
                step_id: step.id,
                status: "completed",
                completed_at: completedAt,
                meta: {},
              },
              { onConflict: "hub_id,member_id,step_id" }
            )

            if (!upsertError) {
              completedCount++
            } else {
              errors.push(`Failed to update progress for member ${member.id}, step ${step.id}: ${upsertError.message}`)
            }
          }
        }
      } catch (memberError: any) {
        errors.push(`Error processing member ${member.id}: ${memberError.message}`)
      }
    }

    return { completed: completedCount, checked: checkedCount, errors }
  } catch (error: any) {
    errors.push(`Backfill failed: ${error.message}`)
    return { completed: 0, checked: 0, errors }
  }
}
