import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET(req: Request) {
  const url = new URL(req.url);
  return NextResponse.json({
    host: url.host,
    WHOP_REDIRECT_URI: process.env.WHOP_REDIRECT_URI || null,
    appIdPresent: !!process.env.NEXT_PUBLIC_WHOP_APP_ID,
    apiKeyPresent: !!process.env.WHOP_API_KEY,
  });
}

