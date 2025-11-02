export const runtime = "nodejs"
import { NextRequest, NextResponse } from "next/server"
import { getChannelsForHub } from "@/server/onboarding/data-hooks"
import { env } from "@/lib/env"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ hubId: string }> }
) {
  if (!env.FEATURE_ONBOARDING) {
    return NextResponse.json({ error: "Feature disabled" }, { status: 404 })
  }

  try {
    const { hubId } = await params
    const channels = await getChannelsForHub(hubId)
    return NextResponse.json({ channels })
  } catch (error: any) {
    console.error("Failed to fetch channels:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

