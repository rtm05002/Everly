export const runtime = "nodejs"
import { NextRequest, NextResponse } from "next/server"
import { getTiersForHub } from "@/server/onboarding/data-hooks"
import { env } from "@/lib/env"

export async function GET(
  req: NextRequest,
  { params }: { params: { hubId: string } }
) {
  if (!env.FEATURE_ONBOARDING) {
    return NextResponse.json({ error: "Feature disabled" }, { status: 404 })
  }

  try {
    const tiers = await getTiersForHub(params.hubId)
    return NextResponse.json({ tiers })
  } catch (error: any) {
    console.error("Failed to fetch tiers:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

