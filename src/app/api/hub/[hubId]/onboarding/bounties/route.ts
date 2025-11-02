export const runtime = "nodejs"
import { NextRequest, NextResponse } from "next/server"
import { getActiveBountiesForHub } from "@/server/onboarding/data-hooks"
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
    const bounties = await getActiveBountiesForHub(hubId)
    return NextResponse.json({ bounties })
  } catch (error: any) {
    console.error("Failed to fetch bounties:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

