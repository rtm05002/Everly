import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { WhopServerSdk } from "@whop/api";
import { signJwt } from "@/lib/jwt";

function jsonDebug(
  req: NextRequest,
  stage: string,
  extra: Record<string, unknown> = {},
) {
  const url = req.nextUrl.toString();
  const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
  const cookieHeader = req.headers.get("cookie") || null;

  return NextResponse.json(
    {
      ok: true,
      stage,
      fullUrl: url,
      searchParams,
      cookieHeader,
      ...extra,
    },
    { status: 200 },
  );
}

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams;
  const debug = search.get("debug");
  const code = search.get("code");
  const state = search.get("state");

  // Step 1: basic param check
  if (!code || !state) {
    if (debug) {
      return jsonDebug(req, "missing_code_or_state", { code, state });
    }
    return NextResponse.redirect(
      new URL("/login?error=missing_code", req.nextUrl),
    );
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get("oauth_state")?.value || null;
  const nextPath = cookieStore.get("oauth_next")?.value || "/overview";

  if (debug === "1") {
    return jsonDebug(req, "parse_params", {
      codePresent: !!code,
      statePresent: !!state,
      state,
      savedState,
      nextPath,
    });
  }

  // Step 2: CSRF protection — state must match
  if (!savedState || savedState !== state) {
    if (debug) {
      return jsonDebug(req, "state_mismatch", {
        state,
        savedState,
        nextPath,
      });
    }
    return NextResponse.redirect(
      new URL("/login?error=state_mismatch", req.nextUrl),
    );
  }

  // Clear one-time cookies (will be set on final response)

  const appApiKey = process.env.WHOP_API_KEY;
  const appId = process.env.NEXT_PUBLIC_WHOP_APP_ID;
  const redirectUri = process.env.WHOP_REDIRECT_URI;

  if (!appApiKey || !appId || !redirectUri) {
    if (debug) {
      return jsonDebug(req, "env_missing", {
        appApiKeyPresent: !!appApiKey,
        appIdPresent: !!appId,
        redirectUri,
      });
    }
    return NextResponse.redirect(
      new URL("/login?error=whop_env_missing", req.nextUrl),
    );
  }

  const whopApi = WhopServerSdk({
    appApiKey,
    appId,
  });

  let authResponse: any;
  try {
    authResponse = await whopApi.oauth.exchangeCode({
      code,
      redirectUri,
    });
  } catch (err: any) {
    if (debug) {
      return jsonDebug(req, "exchange_exception", {
        message: err?.message,
        name: err?.name,
        stack: err?.stack,
      });
    }
    return NextResponse.redirect(
      new URL("/login?error=whop_exchange_throw", req.nextUrl),
    );
  }

  if (debug === "2") {
    return jsonDebug(req, "exchange_result", {
      raw: authResponse,
      okField: authResponse?.ok ?? null,
      tokensPresent: !!authResponse?.tokens,
    });
  }

  // Whop SDK convention: ok + tokens { access_token, ... }
  if (!authResponse?.ok || !authResponse?.tokens?.access_token) {
    if (debug) {
      return jsonDebug(req, "exchange_failed", {
        raw: authResponse,
      });
    }
    return NextResponse.redirect(
      new URL("/login?error=whop_exchange_failed", req.nextUrl),
    );
  }

  // ---- Minimal local session creation ----
  // For now we don't fetch hub/member from Supabase or Whop.
  // We just create a "creator" session tied to a hub ID from env.
  const hubId =
    process.env.DEMO_HUB_ID ||
    process.env.NEXT_PUBLIC_WHOP_COMPANY_ID ||
    "whop_demo_hub";

  const memberId = "whop_oauth_member";
  const role: "creator" = "creator";

  const sessionJwt = signJwt({
    hub_id: hubId,
    member_id: memberId,
    role,
  });

  // Final redirect to original page
  const redirectTo =
    nextPath.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : "/overview";

  const finalRes = NextResponse.redirect(new URL(redirectTo, req.nextUrl), 302);
  
  // Clear one-time cookies
  finalRes.cookies.set({
    name: "oauth_state",
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 0,
  });
  finalRes.cookies.set({
    name: "oauth_next",
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 0,
  });
  
  // Set session cookie
  finalRes.cookies.set({
    name: "session",
    value: sessionJwt,
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return finalRes;
}
