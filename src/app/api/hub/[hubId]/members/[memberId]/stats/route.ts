export const runtime = "nodejs"
import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/server/db"
import { env } from "@/lib/env"

/**
 * Get member-specific statistics
 * Returns: posts count, challenges completed, engagement percentage
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ hubId: string; memberId: string }> }
) {
  try {
    const { hubId, memberId } = await params

    if (!hubId || !memberId) {
      return NextResponse.json(
        { error: "Hub ID and Member ID required" },
        { status: 400 }
      )
    }

    const sb = createServiceClient()

    // Get posts count (from activity_logs where type = 'posted')
    const { count: postsCount } = await sb
      .from("activity_logs")
      .select("*", { count: "exact", head: true })
      .eq("hub_id", hubId)
      .eq("member_id", memberId)
      .eq("type", "posted")

    // Get challenges completed (from bounty_events where status = 'completed')
    const { count: challengesWon } = await sb
      .from("bounty_events")
      .select("*", { count: "exact", head: true })
      .eq("hub_id", hubId)
      .eq("member_id", memberId)
      .eq("status", "completed")

    // Calculate engagement percentage
    // Get total activity count for member
    const { count: totalActivity } = await sb
      .from("activity_logs")
      .select("*", { count: "exact", head: true })
      .eq("hub_id", hubId)
      .eq("member_id", memberId)

    // Get average activity per member in hub (for comparison)
    const { data: allMembers } = await sb
      .from("members")
      .select("id")
      .eq("hub_id", hubId)

    const memberIds = allMembers?.map((m) => m.id) || []
    let totalHubActivity = 0
    if (memberIds.length > 0) {
      const { count } = await sb
        .from("activity_logs")
        .select("*", { count: "exact", head: true })
        .eq("hub_id", hubId)
        .in("member_id", memberIds)

      totalHubActivity = count || 0
    }

    const avgActivityPerMember =
      allMembers && allMembers.length > 0 ? totalHubActivity / allMembers.length : 0
    const engagementPercent =
      avgActivityPerMember > 0
        ? Math.min(100, Math.round((totalActivity || 0) / avgActivityPerMember) * 100)
        : totalActivity && totalActivity > 0
        ? 100
        : 0

    return NextResponse.json({
      postsCount: postsCount || 0,
      challengesWon: challengesWon || 0,
      engagementPercent: Math.min(100, engagementPercent),
      totalActivity: totalActivity || 0,
    })
  } catch (error: any) {
    console.error("[Member Stats API] Error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

