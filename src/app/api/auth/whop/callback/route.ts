// src/app/api/auth/whop/callback/route.ts

import { NextRequest, NextResponse } from "next/server";

import { WhopServerSdk } from "@whop/api";

import { signJwt } from "@/lib/jwt";



const whopApi = WhopServerSdk({

  appApiKey: process.env.WHOP_API_KEY!,

  appId: process.env.NEXT_PUBLIC_WHOP_APP_ID!,

});



const REDIRECT_URI = process.env.WHOP_REDIRECT_URI!;



// Optional: env-driven defaults for who logs in when Whop auth succeeds

const DEFAULT_HUB_ID = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;

const DEFAULT_MEMBER_ID = process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID;



export async function GET(req: NextRequest) {
  try {
    // Parse request URL and extract parameters
    const url = new URL(req.url);
    const debug = url.searchParams.get("debug");
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    // Get raw Cookie header
    const cookieHeader = req.headers.get("cookie") || "";

    // Try to find the state cookie
    const stateCookieKey = state ? `oauth-state.${state}` : null;
    const stateCookie = stateCookieKey
      ? cookieHeader
          .split(";")
          .map((c) => c.trim())
          .find((c) => c.startsWith(stateCookieKey + "=")) || null
      : null;

    // Early debug mode: return diagnostics without calling Whop
    if (debug === "1") {
      return NextResponse.json({
        ok: true,
        stage: "debug",
        hasCode: !!code,
        hasState: !!state,
        redirectUsed: process.env.WHOP_REDIRECT_URI,
        fullUrl: url.toString(),
        searchParams: Object.fromEntries(url.searchParams.entries()),
        cookieHeader,
        stateCookieKey,
        stateCookie,
      });
    }

    // Normal flow: validate parameters
    if (!code || !state) {
      return NextResponse.redirect(
        `/login?error=missing_code_or_state&details=${encodeURIComponent(
          JSON.stringify({ hasCode: !!code, hasState: !!state })
        )}`
      );
    }

    // Recover the original "next" from the state cookie set in /auth/whop/start
    const nextFromState = stateCookie
      ? decodeURIComponent(stateCookie.substring(stateCookieKey!.length + 1))
      : "/overview";

    // Exchange code for Whop access token
    const authResponse = await whopApi.oauth.exchangeCode({
      code,
      redirectUri: REDIRECT_URI,
    });

    if (!authResponse.ok) {
      return NextResponse.redirect("/login?error=whop_exchange_failed");
    }

    // For v1, we skip calling Whop for profile details and just use env IDs.
    // (These are already in your env for your own company/agent.)
    const hubId = DEFAULT_HUB_ID;
    const memberId = DEFAULT_MEMBER_ID;

    if (!hubId || !memberId) {
      // If these are missing, we can't create a session. Safer to fail loudly.
      return NextResponse.redirect(
        "/login?error=missing_hub_or_member&hint=configure NEXT_PUBLIC_WHOP_COMPANY_ID and NEXT_PUBLIC_WHOP_AGENT_USER_ID"
      );
    }

    const jwt = signJwt({
      hub_id: hubId,
      member_id: memberId,
      role: "creator",
    });

    const res = NextResponse.redirect(nextFromState || "/overview");

    res.cookies.set("session", jwt, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;
  } catch (err) {
    // Log the error
    console.error("[whop callback error]", err);

    // If debug mode, return detailed error JSON
    const url = new URL(req.url);
    const debug = url.searchParams.get("debug");
    if (debug === "1") {
      return NextResponse.json(
        {
          ok: false,
          stage: "exception",
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : null,
        },
        { status: 500 }
      );
    }

    // Otherwise, return generic redirect
    return NextResponse.redirect("/login?error=whop_callback_failed");
  }
}
