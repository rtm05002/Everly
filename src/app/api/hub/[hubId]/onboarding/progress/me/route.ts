export const runtime = "nodejs"
import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"
import { env } from "@/lib/env"

export async function GET(req: NextRequest, { params }: { params: { hubId: string } }) {
  if (!env.FEATURE_ONBOARDING) {
    return NextResponse.json({ error: "Feature disabled" }, { status: 404 })
  }

  try {
    const supa = getSupabaseServer()
    
    // TODO: Extract member_id from JWT token
    
    const memberId = req.headers.get("x-member-id") || "00000000-0000-0000-0000-000000000000"
    
    const { data, error } = await supa
      .from("onboarding_progress")
      .select("*")
      .eq("hub_id", params.hubId)
      .eq("member_id", memberId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching progress:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ progress: data || [] })
  } catch (error: any) {
    console.error("Failed to fetch progress:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

