import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET(req: Request) {
  return NextResponse.json({ url: req.url });
}

