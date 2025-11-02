export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"
import { renderTemplate, dedupeKey } from "@/lib/nudges-render"
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
    const { recipe, memberIds } = await req.json()
    
    if (!recipe || !memberIds || !Array.isArray(memberIds)) {
      return NextResponse.json(
        { error: "Recipe and memberIds array required" },
        { status: 400 }
      )
    }

    const supa = getSupabaseServer()

    // Create nudge run record
    const { data: runRow, error: runErr } = await supa
      .from("nudge_runs")
      .insert({
        hub_id: hubId,
        recipe_id: recipe.id,
        initiated_by: "creator:" + hubId,
        status: "running"
      })
      .select()
      .single()

    if (runErr) {
      return NextResponse.json({ error: runErr.message }, { status: 400 })
    }

    // Fetch member data for rendering
    const { data: members, error: membersError } = await supa
      .from("members")
      .select("id, whop_member_id, last_active_at")
      .in("id", memberIds)

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 })
    }

    // Generate messages for each member
    const messages = (members ?? []).map(m => {
      const inactiveDays = m.last_active_at 
        ? Math.floor((Date.now() - new Date(m.last_active_at).getTime()) / 86400000)
        : 999

      const vars = {
        first_name: m.whop_member_id ?? "there",
        inactive_days: inactiveDays,
        cta_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/widget?hubId=${hubId}`,
        community_name: "Everly Community"
      }

      return {
        hub_id: hubId,
        recipe_id: recipe.id,
        run_id: runRow.id,
        member_id: m.id,
        channel: recipe.channel ?? "dm",
        dedupe_key: dedupeKey(hubId, recipe.id, m.id, "week"),
        rendered_message: renderTemplate(recipe.message_template, vars),
        status: "queued",
        meta: {
          member_whop_id: m.whop_member_id,
          inactive_days: inactiveDays
        }
      }
    })

    // Insert all messages
    const { error: insErr } = await supa
      .from("nudge_messages")
      .insert(messages)

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 400 })
    }

    // Update run status
    await supa
      .from("nudge_runs")
      .update({
        targeted_count: messages.length,
        status: "completed",
        finished_at: new Date().toISOString()
      })
      .eq("id", runRow.id)

    return NextResponse.json({
      ok: true,
      runId: runRow.id,
      targeted: messages.length,
      queued: messages.length
    })

  } catch (error) {
    console.error("Run error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
