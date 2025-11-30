export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createServiceClient } from "@/server/db";
import { readCookie, verifyToken } from "@/lib/auth/session";
import { DEMO_MODE, DEMO_HUB_ID } from "@/lib/env.server";

export async function DELETE(req: Request, { params }: { params: { sourceId: string } }) {
  try {
    const token = readCookie(req);
    const claims = verifyToken(token);
    // In demo mode, always use DEMO_HUB_ID (override claims)
    const effectiveHubId = DEMO_MODE && DEMO_HUB_ID ? DEMO_HUB_ID : (claims?.hub_id ?? null);
    if (!effectiveHubId) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const db = createServiceClient();
    const { data: source, error } = await db
      .from("ai_sources")
      .select("id, hub_id")
      .eq("id", params.sourceId)
      .maybeSingle();

    if (error || !source || source.hub_id !== effectiveHubId) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    const { error: deleteError } = await db
      .from("ai_sources")
      .delete({ count: "exact" })
      .eq("id", params.sourceId)
      .eq("hub_id", effectiveHubId);

    if (deleteError) {
      return NextResponse.json({ ok: false, error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "delete_failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "method_not_allowed" }, { status: 405 });
}

export async function POST() {
  return NextResponse.json({ ok: false, error: "method_not_allowed" }, { status: 405 });
}

