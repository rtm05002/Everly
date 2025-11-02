export const runtime = "nodejs"
import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"
import { env } from "@/lib/env"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ hubId: string }> }
) {
  try {
    const { hubId } = await params
    const supa = getSupabaseServer()
    const { data, error } = await supa
      .from("members")
      .select("id, whop_member_id")
      .eq("hub_id", hubId)
      .limit(50)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching members:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ members: data || [] })
  } catch (error: any) {
    console.error("Failed to fetch members:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

