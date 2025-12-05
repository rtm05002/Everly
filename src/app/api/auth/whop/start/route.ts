import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next") || "/overview";

  const appId = process.env.NEXT_PUBLIC_WHOP_APP_ID;
  const redirectUri = process.env.WHOP_REDIRECT_URI;

  if (!appId || !redirectUri) {
    return NextResponse.redirect(new URL("/login?error=whop_env_missing", url));
  }

  // ---- single state value ----
  const state = crypto.randomUUID();

  const whopAuthUrl = new URL("https://whop.com/oauth/");
  whopAuthUrl.searchParams.set("client_id", appId);
  whopAuthUrl.searchParams.set("response_type", "code");
  whopAuthUrl.searchParams.set("scope", "read_user");
  whopAuthUrl.searchParams.set("redirect_uri", redirectUri);
  whopAuthUrl.searchParams.set("state", state);

  const res = NextResponse.redirect(whopAuthUrl.toString());

  // Get domain from request hostname for cookie
  const domain = url.hostname;
  const cookieDomain = domain && !domain.includes("localhost") ? domain : undefined;

  // clear any old oauth cookies
  res.cookies.set({
    name: "oauth_state",
    value: "",
    path: "/",
    httpOnly: true,
    sameSite: "none",
    secure: true,
    domain: cookieDomain,
    maxAge: 0,
  });
  res.cookies.set({
    name: "oauth_next",
    value: "",
    path: "/",
    httpOnly: true,
    sameSite: "none",
    secure: true,
    domain: cookieDomain,
    maxAge: 0,
  });

  // set fresh ones
  res.cookies.set({
    name: "oauth_state",
    value: state,
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
    domain: cookieDomain,
    maxAge: 60 * 60, // 1 hour
  });

  res.cookies.set({
    name: "oauth_next",
    value: next,
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
    domain: cookieDomain,
    maxAge: 60 * 60, // 1 hour
  });

  // Dynamic cookie for preview environments (state in cookie name)
  res.cookies.set({
    name: `oauth-state.${state}`,
    value: next,
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    domain: req.nextUrl.hostname, // This fixes preview environments
    maxAge: 60 * 60, // 1 hour
  });

  return res;
}
