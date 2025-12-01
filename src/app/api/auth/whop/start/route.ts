import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

export async function GET(req: NextRequest) {
  const redirectUri = process.env.WHOP_REDIRECT_URI;
  
  if (!process.env.WHOP_API_KEY || !process.env.NEXT_PUBLIC_WHOP_APP_ID || !redirectUri) {
    return NextResponse.redirect("/login?error=whop_env_missing");
  }

  // Optional: read next param, but we'll default to /overview
  const url = new URL(req.url);
  const next = url.searchParams.get("next") ?? "/overview";

  // Build Whop OAuth URL manually
  const authUrl = new URL("https://whop.com/oauth/");
  authUrl.searchParams.set("client_id", process.env.NEXT_PUBLIC_WHOP_APP_ID);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "read_user");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  
  // Generate random state for CSRF (but we won't enforce it)
  const state = crypto.randomUUID();
  authUrl.searchParams.set("state", state);

  // If next is not /overview, we can pass it as a query param to the callback
  if (next !== "/overview") {
    authUrl.searchParams.set("next", next);
  }

  return NextResponse.redirect(authUrl.toString(), 302);
}
