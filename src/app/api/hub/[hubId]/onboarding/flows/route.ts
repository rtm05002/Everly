export const runtime = "nodejs"
import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"
import { env } from "@/lib/env"

export async function GET(req: NextRequest, { params }: { params: Promise<{ hubId: string }> }) {
  if (!env.FEATURE_ONBOARDING) {
    return NextResponse.json({ error: "Feature disabled" }, { status: 404 })
  }

  try {
    const { hubId } = await params
    const supa = getSupabaseServer()
    const { data, error } = await supa
      .from("onboarding_flows")
      .select("id, name, description, is_default")
      .eq("hub_id", hubId)
      .eq("enabled", true)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching flows:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ flows: data || [] })
  } catch (error: any) {
    console.error("Failed to fetch flows:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ hubId: string }> }) {
  if (!env.FEATURE_ONBOARDING) {
    return NextResponse.json({ error: "Feature disabled" }, { status: 404 })
  }

  try {
    const { hubId } = await params
    const body = await req.json()
    const supa = getSupabaseServer()
    
    // TODO: Check creator token
    
    const { data, error } = await supa
      .from("onboarding_flows")
      .insert({
        hub_id: hubId,
        name: body.name,
        description: body.description || null,
        audience: body.audience || {},
        is_default: body.is_default || false,
        enabled: body.enabled !== undefined ? body.enabled : true
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating flow:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ flow: data }, { status: 201 })
  } catch (error: any) {
    console.error("Failed to create flow:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

