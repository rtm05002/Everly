export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createServiceClient } from "@/server/db";
import { readCookie, verifyToken } from "@/lib/auth/session";
import { syncWhopSource } from "@/lib/whop/fetchers";
import { DEMO_MODE, DEMO_HUB_ID } from "@/lib/env.server";

async function syncUrlSource(db: ReturnType<typeof createServiceClient>, source: any) {
  // Placeholder: integrate your URL sync implementation here.
  // For now, just mark success immediately.
  return { ok: true, message: "URL sync not yet implemented" };
}

export async function POST(req: Request, { params }: { params: { sourceId: string } }) {
  const token = req.headers.get("x-admin-task-token");
  if (!token || token !== process.env.ADMIN_TASK_TOKEN) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

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
    .select("id, hub_id, kind, locked_until")
    .eq("id", params.sourceId)
    .maybeSingle();

  if (sourceError || !source) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  if (source.hub_id !== effectiveHubId) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  if (source.kind.startsWith("whop:") && process.env.FEATURE_WHOP_SYNC === "false") {
    return NextResponse.json({ ok: false, error: "temporarily_disabled" }, { status: 503 });
  }

  if (source.locked_until && new Date(source.locked_until).getTime() > Date.now()) {
    return NextResponse.json({ ok: false, error: "busy" }, { status: 409 });
  }

  const nowIso = new Date().toISOString();
  const lockUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await db
    .from("ai_sources")
    .update({ locked_until: lockUntil })
    .eq("id", source.id);

  const { data: runRow, error: runError } = await db
    .from("ai_sync_runs")
    .insert({
      source_id: source.id,
      status: "queued",
      started_at: nowIso,
    })
    .select("id")
    .single();

  if (runError || !runRow) {
    await db
      .from("ai_sources")
      .update({ locked_until: null })
      .eq("id", source.id);
    return NextResponse.json({ ok: false, error: "run_creation_failed" }, { status: 500 });
  }

  const runId = runRow.id;

  queueMicrotask(async () => {
    try {
      await db
        .from("ai_sync_runs")
        .update({ status: "running" })
        .eq("id", runId);

      if (source.kind === "url") {
        await syncUrlSource(db, source);
      } else if (source.kind.startsWith("whop:")) {
        const whopKind = source.kind.replace("whop:", "");
        await syncWhopSource({ hubId: source.hub_id, kind: whopKind as any, maxItems: 200 });
      }

      await db
        .from("ai_sync_runs")
        .update({ status: "success", finished_at: new Date().toISOString() })
        .eq("id", runId);
    } catch (err: any) {
      await db
        .from("ai_sync_runs")
        .update({ status: "failed", finished_at: new Date().toISOString(), error: err?.message || "sync_failed" })
        .eq("id", runId);
    } finally {
      await db
        .from("ai_sources")
        .update({ locked_until: null })
        .eq("id", source.id);
    }
  });

  return NextResponse.json({ ok: true, runId });
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "method_not_allowed" }, { status: 405 });
}
