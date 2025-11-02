export const runtime = "nodejs"
import { NextRequest, NextResponse } from "next/server"
import { validateChannelExists } from "@/server/onboarding/data-hooks"
import { env } from "@/lib/env"

export async function GET(
  req: NextRequest,
  { params }: { params: { hubId: string; channelId: string } }
) {
  if (!env.FEATURE_ONBOARDING) {
    return NextResponse.json({ error: "Feature disabled" }, { status: 404 })
  }

  try {
    const exists = await validateChannelExists(params.hubId, params.channelId)
    if (exists) {
      return NextResponse.json({ valid: true })
    } else {
      return NextResponse.json({ valid: false, error: "Channel not found" }, { status: 404 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

