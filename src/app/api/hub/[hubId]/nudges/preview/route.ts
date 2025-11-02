export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"
import { env } from "@/lib/env"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ hubId: string }> }
) {
  if (env.FEATURE_NUDGES !== 'true') {
    return NextResponse.json({ disabled: true }, { status: 404 })
  }

  try {
    const { hubId } = await params
    const { recipe } = await req.json()
    
    if (!recipe || !recipe.trigger) {
      return NextResponse.json({ error: "Recipe and trigger required" }, { status: 400 })
    }

    const supa = getSupabaseServer()
    let candidateIds: string[] = []

    // For MVP: simple filtering using members table
    const { data: members, error } = await supa
      .from("members")
      .select("id, last_active_at")
      .eq("hub_id", hubId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Filter based on trigger type
    if (recipe.trigger?.type === "inactive_days") {
      const inactiveDays = recipe.trigger.gte || 7
      const cutoffDate = new Date(Date.now() - inactiveDays * 86400000)
      
      candidateIds = (members ?? [])
        .filter(m => !m.last_active_at || new Date(m.last_active_at) < cutoffDate)
        .map(m => m.id)
    } else if (recipe.trigger?.type === "new_member_joined") {
      const withinHours = recipe.trigger.withinHours || 24
      const cutoffDate = new Date(Date.now() - withinHours * 3600000)
      
      candidateIds = (members ?? [])
        .filter(m => m.last_active_at && new Date(m.last_active_at) >= cutoffDate)
        .map(m => m.id)
    } else {
      // Default: return all members for testing
      candidateIds = (members ?? []).map(m => m.id)
    }

    return NextResponse.json({
      count: candidateIds.length,
      sample: candidateIds.slice(0, 10),
      trigger: recipe.trigger?.type || "unknown"
    })

  } catch (error) {
    console.error("Preview error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
