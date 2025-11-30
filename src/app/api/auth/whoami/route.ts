import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;)\s*session=([^;]+)/);
  const token = m?.[1];
  if (!token) return NextResponse.json({ ok: false, error: "no_session_cookie" }, { status: 401 });

  const SECRET = process.env.JWT_SIGNING_SECRET || process.env.SUPABASE_JWT_SECRET;
  try {
    const claims = jwt.verify(token, SECRET!) as any;
    return NextResponse.json({ ok: true, claims });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "invalid_session", detail: e?.message }, { status: 401 });
  }
}

