export const runtime = "nodejs"
import { NextRequest, NextResponse } from "next/server"
import { backfillFlowProgress } from "@/server/onboarding/resolve"
import { env } from "@/lib/env"

export async function POST(
  req: NextRequest,
  { params }: { params: { hubId: string; flowId: string } }
) {
  if (!env.FEATURE_ONBOARDING) {
    return NextResponse.json({ error: "Feature disabled" }, { status: 404 })
  }

  try {
    // TODO: Add admin/creator authentication check
    // const userRole = await getUserRole(req)
    // if (!userRole || !['creator', 'moderator'].includes(userRole)) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    // }

    const result = await backfillFlowProgress(params.hubId, params.flowId)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error: any) {
    console.error("Failed to run backfill:", error)
    return NextResponse.json(
      { error: error.message || "Failed to run backfill" },
      { status: 500 }
    )
  }
}

