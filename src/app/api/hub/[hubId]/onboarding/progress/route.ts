export const runtime = "nodejs"
import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"
import { env } from "@/lib/env"

export async function POST(req: NextRequest, { params }: { params: { hubId: string } }) {
  if (!env.FEATURE_ONBOARDING) {
    return NextResponse.json({ error: "Feature disabled" }, { status: 404 })
  }

  try {
    const body = await req.json()
    const supa = getSupabaseServer()
    
    // TODO: Extract member_id from JWT token
    
    const memberId = body.member_id || "00000000-0000-0000-0000-000000000000"
    
    const { data, error } = await supa
      .from("onboarding_progress")
      .upsert({
        hub_id: params.hubId,
        member_id: memberId,
        flow_id: body.flow_id,
        step_id: body.step_id,
        status: body.status || "pending",
        completed_at: body.status === "completed" ? new Date().toISOString() : null,
        meta: body.meta || {}
      }, {
        onConflict: "hub_id,member_id,step_id"
      })
      .select()
      .single()

    if (error) {
      console.error("Error upserting progress:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ progress: data }, { status: 201 })
  } catch (error: any) {
    console.error("Failed to upsert progress:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

