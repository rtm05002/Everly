import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

const WHOP_AUTH_URL = "https://whop.com/oauth/";

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams;
  const next = search.get("next") || "/overview";

  const clientId = process.env.NEXT_PUBLIC_WHOP_APP_ID;
  const redirectUri = process.env.WHOP_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.redirect(
      new URL("/login?error=whop_env_missing", req.nextUrl),
    );
  }

  // Random state for CSRF protection
  const state = crypto.randomUUID();

  const res = NextResponse.redirect(
    new URL(
      `${WHOP_AUTH_URL}?client_id=${encodeURIComponent(
        clientId,
      )}&response_type=code&scope=read_user&state=${encodeURIComponent(
        state,
      )}&redirect_uri=${encodeURIComponent(redirectUri)}`,
    ),
  );

  // Set OAuth state and redirect cookies
  res.cookies.set({
    name: `oauth-state.${state}`,
    value: next,
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
    maxAge: 3600,
  });

  res.cookies.set({
    name: "oauth-redirect",
    value: redirectUri,
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
    maxAge: 3600,
  });

  return res;
}
