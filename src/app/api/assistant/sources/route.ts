export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createServiceClient } from "@/server/db";
import { readCookie, verifyToken } from "@/lib/auth/session";
import { DEMO_MODE, DEMO_HUB_ID } from "@/lib/env.server";

interface SourceRow {
  id: string;
  kind: string;
  name: string;
  doc_count: number;
  chunk_count: number;
  last_synced_at: string | null;
  status: "queued" | "running" | "success" | "failed" | null;
  last_run_at: string | null;
}

export async function GET(req: Request) {
  try {
    const token = readCookie(req);
    const session = verifyToken(token);
    // In demo mode, always use DEMO_HUB_ID (override session)
    const hubId = DEMO_MODE && DEMO_HUB_ID ? DEMO_HUB_ID : (session?.hub_id ?? null);
    if (!hubId) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const db = createServiceClient();
    
    // Get sources without loading all sync runs (to avoid memory issues)
    const { data: sources, error: sourcesError } = await db
      .schema("public")
      .from("ai_sources")
      .select("id, kind, name, doc_count, chunk_count, last_synced_at")
      .eq("hub_id", hubId)
      .order("updated_at", { ascending: false });

    if (sourcesError) {
      return NextResponse.json({ ok: false, error: sourcesError.message }, { status: 500 });
    }

    // Get latest sync run for each source efficiently
    // Use Promise.all to fetch in parallel but with limit 1 per source
    const rows: SourceRow[] = await Promise.all(
      (sources || []).map(async (source: any) => {
        // Get only the latest run for this source (limit 1 to avoid memory issues)
        const { data: latestRun } = await db
          .from("ai_sync_runs")
          .select("status, finished_at, started_at")
          .eq("source_id", source.id)
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        return {
          id: source.id,
          kind: source.kind,
          name: source.name,
          doc_count: source.doc_count ?? 0,
          chunk_count: source.chunk_count ?? 0,
          last_synced_at: source.last_synced_at ?? null,
          status: latestRun?.status ?? null,
          last_run_at: latestRun?.finished_at ?? latestRun?.started_at ?? null,
        };
      })
    );

    return NextResponse.json({ ok: true, data: rows });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "unexpected_error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { hub_id, kind, name, settings } = body

    if (!hub_id || !kind || !name) {
      return NextResponse.json(
        { error: "hub_id, kind, and name are required" },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()
    
    const { data: source, error } = await supabase
      .from('ai_sources')
      .insert({
        hub_id,
        kind,
        name,
        settings: settings || {},
        config: settings || {}, // Backward compatibility
      })
      .select()
      .single()

    if (error) {
      console.error("[Sources POST] Error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(source)
  } catch (err: any) {
    console.error("[Sources POST] Exception:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

