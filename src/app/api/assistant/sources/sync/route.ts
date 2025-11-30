export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const sourceId = body?.sourceId;
    if (!sourceId || typeof sourceId !== "string") {
      return NextResponse.json({ ok: false, error: "invalid_source_id" }, { status: 400 });
    }

    const target = new URL(`/api/assistant/sources/${sourceId}/sync`, req.url);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const adminHeader = req.headers.get("x-admin-task-token") || process.env.ADMIN_TASK_TOKEN || "";
    if (adminHeader) {
      headers["x-admin-task-token"] = adminHeader;
    }
    const cookie = req.headers.get("cookie");
    if (cookie) {
      headers["cookie"] = cookie;
    }

    const res = await fetch(target, {
      method: "POST",
      headers,
    });

    const json = await res.json().catch(() => ({}));
    return NextResponse.json(json, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "sync_failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "method_not_allowed" }, { status: 405 });
}

