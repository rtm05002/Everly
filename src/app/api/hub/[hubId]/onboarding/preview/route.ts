export const runtime = "nodejs"
import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"
import { evaluateStepCompletion } from "@/server/onboarding/resolve"
import { env } from "@/lib/env"
import type { OnboardingStep } from "@/lib/types"

export async function POST(
  req: NextRequest,
  { params }: { params: { hubId: string } }
) {
  if (!env.FEATURE_ONBOARDING) {
    return NextResponse.json({ error: "Feature disabled" }, { status: 404 })
  }

  try {
    const body = await req.json()
    const { memberId, flowId } = body

    if (!memberId || !flowId) {
      return NextResponse.json(
        { error: "memberId and flowId required" },
        { status: 400 }
      )
    }

    const supa = getSupabaseServer()

    // Get steps for the flow
    const { data: steps, error: stepsError } = await supa
      .from("onboarding_steps")
      .select("*")
      .eq("hub_id", params.hubId)
      .eq("flow_id", flowId)
      .order("order_index", { ascending: true })

    if (stepsError || !steps) {
      return NextResponse.json(
        { error: stepsError?.message || "Failed to load steps" },
        { status: 500 }
      )
    }

    // Get member's recent activity (last 45 days to match backfill)
    const daysToCheck = 45
    const cutoffDate = new Date(
      Date.now() - daysToCheck * 24 * 60 * 60 * 1000
    ).toISOString()

    const [activitiesRes, bountiesRes] = await Promise.all([
      supa
        .from("activity_logs")
        .select("type, meta, created_at")
        .eq("hub_id", params.hubId)
        .eq("member_id", memberId)
        .gte("created_at", cutoffDate)
        .order("created_at", { ascending: false })
        .limit(200),
      supa
        .from("bounty_events")
        .select("bounty_id, created_at")
        .eq("hub_id", params.hubId)
        .eq("member_id", memberId)
        .eq("status", "completed")
        .gte("created_at", cutoffDate),
    ])

    const activities = activitiesRes.data || []
    const bountyEvents = bountiesRes.data || []

    // Convert bounty events to activity format
    const bountyActivities = bountyEvents.map((be) => ({
      type: "bounty.completed",
      meta: { bounty_id: be.bounty_id },
      created_at: be.created_at,
    }))

    const allEvents = [...activities, ...bountyActivities]

    // Evaluate each step using the resolver
    const completedSteps: Array<{ stepId: string; completedAt: string }> = []
    const stepResults: Array<{
      stepId: string
      title: string
      completed: boolean
      completedAt?: string
      matchedEvent?: string
    }> = []

    for (const step of steps as OnboardingStep[]) {
      let stepCompleted = false
      let completedAt: string | null = null
      let matchedEvent: string | null = null

      for (const activity of allEvents) {
        const eventData = {
          type: activity.type,
          meta: activity.meta || {},
          member_id: memberId,
          created_at: activity.created_at,
        }

        const matches = await evaluateStepCompletion(step, eventData)
        if (matches && step.id) {
          stepCompleted = true
          completedAt = activity.created_at
          matchedEvent = activity.type
          completedSteps.push({ stepId: step.id, completedAt: activity.created_at })
          break // Use first matching event
        }
      }

      if (step.id) {
        stepResults.push({
          stepId: step.id,
          title: step.title,
          completed: stepCompleted,
          completedAt: completedAt || undefined,
          matchedEvent: matchedEvent || undefined,
        })
      }
    }

    return NextResponse.json({
      completedSteps: completedSteps.map((s) => s.stepId),
      stepResults,
      activityCount: allEvents.length,
    })
  } catch (error: any) {
    console.error("Failed to preview member:", error)
    return NextResponse.json(
      { error: error.message || "Failed to preview member" },
      { status: 500 }
    )
  }
}
