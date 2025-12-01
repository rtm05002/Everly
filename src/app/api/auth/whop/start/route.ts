import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next") || "/overview";

  const redirectUri = process.env.WHOP_REDIRECT_URI!;
  const appId = process.env.NEXT_PUBLIC_WHOP_APP_ID!;

  if (!redirectUri || !appId) {
    return NextResponse.redirect(
      new URL("/login?error=whop_env_missing", url),
    );
  }

  // 🔑 ONE state value for everything
  const state = crypto.randomUUID();

  // Build Whop authorize URL
  const whopAuthUrl = new URL("https://whop.com/oauth/");
  whopAuthUrl.searchParams.set("client_id", appId);
  whopAuthUrl.searchParams.set("response_type", "code");
  whopAuthUrl.searchParams.set("scope", "read_user");
  whopAuthUrl.searchParams.set("redirect_uri", redirectUri);
  whopAuthUrl.searchParams.set("state", state);

  // Create redirect response
  const res = NextResponse.redirect(whopAuthUrl.toString());

  // Correct state cookie (matches exactly the URL state)
  res.cookies.set({
    name: `oauth-state.${state}`,
    value: next,
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
    maxAge: 60 * 60, // 1 hour
  });

  // Optional: still keep oauth-redirect if you like
  res.cookies.set({
    name: "oauth-redirect",
    value: redirectUri,
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
    maxAge: 60 * 60,
  });

  return res;
}
