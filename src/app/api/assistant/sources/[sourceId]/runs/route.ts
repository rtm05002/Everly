export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createServiceClient } from "@/server/db";
import { readCookie, verifyToken } from "@/lib/auth/session";
import { DEMO_MODE, DEMO_HUB_ID } from "@/lib/env.server";

export async function GET(req: Request, { params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = await params;
  const sessionToken = readCookie(req);
  const claims = verifyToken(sessionToken);
  // In demo mode, always use DEMO_HUB_ID (override claims)
  const effectiveHubId = DEMO_MODE && DEMO_HUB_ID ? DEMO_HUB_ID : (claims?.hub_id ?? null);
  if (!effectiveHubId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  const { data: source, error: sourceError } = await db
    .from("ai_sources")
    .select("id, hub_id")
    .eq("id", sourceId)
    .maybeSingle();

  if (sourceError || !source || source.hub_id !== effectiveHubId) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const { data: runs, error: runsError } = await db
    .from("ai_sync_runs")
    .select("id, status, started_at, finished_at, stats")
    .eq("source_id", source.id)
    .order("started_at", { ascending: false })
    .limit(10);

  if (runsError) {
    return NextResponse.json({ ok: false, error: runsError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: runs || [] });
}

export async function POST() {
  return NextResponse.json({ ok: false, error: "method_not_allowed" }, { status: 405 });
}

