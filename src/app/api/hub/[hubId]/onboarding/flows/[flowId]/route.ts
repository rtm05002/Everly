export const runtime = "nodejs"
import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"
import { env } from "@/lib/env"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ hubId: string; flowId: string }> }
) {
  if (!env.FEATURE_ONBOARDING) {
    return NextResponse.json({ error: "Feature disabled" }, { status: 404 })
  }

  try {
    const { hubId, flowId } = await params
    const supa = getSupabaseServer()
    
    // Fetch flow details
    const { data: flow, error: flowError } = await supa
      .from("onboarding_flows")
      .select("*")
      .eq("id", flowId)
      .eq("hub_id", hubId)
      .single()

    if (flowError) {
      console.error("Error fetching flow:", flowError)
      return NextResponse.json({ error: flowError.message }, { status: 500 })
    }

    // Fetch steps ordered by order_index
    const { data: steps, error: stepsError } = await supa
      .from("onboarding_steps")
      .select("*")
      .eq("flow_id", flowId)
      .eq("hub_id", hubId)
      .order("order_index", { ascending: true })

    if (stepsError) {
      console.error("Error fetching steps:", stepsError)
      return NextResponse.json({ error: stepsError.message }, { status: 500 })
    }

    return NextResponse.json({ flow, steps: steps || [] })
  } catch (error: any) {
    console.error("Failed to fetch flow details:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

