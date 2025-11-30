import { NextResponse } from "next/server";
import { WhopServerSdk } from "@whop/api";
import { signJwt } from "@/lib/jwt";
import { DEMO_HUB_ID } from "@/lib/env.server";

export const runtime = "nodejs";

const whop = WhopServerSdk({
  appApiKey: process.env.WHOP_API_KEY!,
  appId: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
});

function j(status: number, obj: Record<string, unknown>) {
  return NextResponse.json(obj, { status });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const debug = url.searchParams.get("debug") === "1";

  // Early debug mode: return JSON before any processing if debug=1
  if (debug) {
    return j(200, {
      ok: false,
      stage: "parse_params",
      hasCode: !!code,
      hasState: !!state,
      redirectUsed: process.env.WHOP_REDIRECT_URI ?? null,
      fullUrl: url.toString(),
      searchParams: Object.fromEntries(url.searchParams.entries()),
      queryString: url.search,
    });
  }

  if (!code || !state) {
    // Enhanced error info to help debug missing params
    return j(400, { 
      ok: false, 
      stage: "parse_params", 
      error: "missing_code_or_state",
      hasCode: !!code,
      hasState: !!state,
      fullUrl: url.toString(),
      searchParams: Object.fromEntries(url.searchParams.entries()),
      redirectUri: process.env.WHOP_REDIRECT_URI ?? null,
    });
  }

  const stateCookie = req.headers
    .get("Cookie")
    ?.split(";")
    .find((c) => c.trim().startsWith(`oauth-state.${state}=`));
  const next = stateCookie ? decodeURIComponent(stateCookie.split("=")[1]) : "/overview";

  const redirectUri = process.env.WHOP_REDIRECT_URI!;

  const authResponse = await whop.oauth.exchangeCode({ code, redirectUri });
  if (!authResponse.ok) {
    const status = (authResponse as any).status ?? 400;
    const body = (authResponse as any).body ?? (authResponse as any).error ?? null;
    const bodySnippet = typeof body === "string" 
      ? body.substring(0, 500) 
      : (typeof body === "object" 
          ? JSON.stringify(body).substring(0, 500) 
          : String(body).substring(0, 500));

    // Enhanced debug mode for exchangeCode failures
    const debugMode = url.searchParams.get("debug") === "1";
    if (debugMode) {
      return j(400, {
        ok: false,
        stage: "exchange_code",
        redirectUsed: redirectUri,
        codeLen: code.length,
        appIdPresent: !!process.env.NEXT_PUBLIC_WHOP_APP_ID,
        apiKeyPresent: !!process.env.WHOP_API_KEY,
        tokenStatus: status,
        tokenBody: bodySnippet,
        stateCookiePresent: !!stateCookie,
      });
    }

    return j(400, {
      ok: false,
      stage: "exchangeCode",
      redirectUsed: redirectUri,
      codeLen: code.length,
      status,
      body,
      stateCookiePresent: !!stateCookie,
    });
  }

  const { access_token } = authResponse.tokens;
  
  // If debug mode was requested but we got here, return success info
  if (debug) {
    return j(200, { ok: true, stage: "exchangeCode", gotToken: !!access_token });
  }

  // Create session: Use DEMO_HUB_ID as hub_id (or fallback)
  // For member_id, use a simple deterministic string
  // In the future, this could fetch actual Whop user/org data
  const hubId = DEMO_HUB_ID || process.env.DEMO_HUB_ID || "default-hub";
  const memberId = "whop_creator"; // Simple deterministic ID for now
  const role = "creator" as const;

  // Sign JWT with the same structure middleware expects
  const sessionToken = signJwt({ hub_id: hubId, member_id: memberId, role });

  // Create redirect response
  const redirectUrl = new URL(next, url.origin);
  const res = NextResponse.redirect(redirectUrl, 302);

  // Set session cookie with same attributes as dev bypass
  const cookieMaxAge = 60 * 60 * 24 * 7; // 7 days
  const cookieSecure = process.env.NODE_ENV === "production" ? "Secure;" : "";
  res.headers.append(
    "Set-Cookie",
    `session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; ${cookieSecure} Max-Age=${cookieMaxAge}`
  );

  return res;
}
