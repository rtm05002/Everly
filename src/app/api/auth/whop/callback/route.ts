import { NextRequest, NextResponse } from "next/server";
import { WhopServerSdk } from "@whop/api";
import { signJwt } from "@/lib/jwt";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const search = url.searchParams;
  const debug = search.get("debug");
  const code = search.get("code");
  const state = search.get("state");
  const cookieHeader = req.headers.get("cookie") || "";

  const baseDebug = {
    fullUrl: url.toString(),
    searchParams: Object.fromEntries(search.entries()),
    cookieHeader,
  };

  const debugJson = (stage: string, extra: Record<string, unknown> = {}) =>
    NextResponse.json(
      { ok: false, stage, ...baseDebug, ...extra },
      { status: 200 },
    );

  try {
    // STEP 1: basic param check
    if (!code) {
      if (debug) {
        return NextResponse.json(
          { ok: false, stage: "missing_code" },
          { status: 400 },
        );
      }
      return NextResponse.redirect(
        new URL("/login?error=missing_code", url),
      );
    }

    // STEP 2: compute state cookie name and value (advisory only, never blocks)
    const stateCookieName = state ? `oauth-state.${state}` : null;
    const cookies = req.cookies;
    const stateCookieValue = stateCookieName ? cookies.get(stateCookieName)?.value : undefined;
    const stateCookieExists = !!stateCookieValue;

    // STEP 3: compute fallback next path
    const nextPath = stateCookieValue || "/overview";

    // Debug mode - return diagnostics (no error)
    if (debug === "2") {
      return NextResponse.json({
        ok: true,
        stage: "parse_params",
        fullUrl: url.toString(),
        searchParams: Object.fromEntries(search.entries()),
        cookieHeader: req.headers.get("cookie") ?? null,
        state,
        stateCookieName,
        stateCookieExists,
        nextPath,
      });
    }


    const appApiKey = process.env.WHOP_API_KEY;
    const appId = process.env.NEXT_PUBLIC_WHOP_APP_ID;
    const redirectUri = process.env.WHOP_REDIRECT_URI;

    if (!appApiKey || !appId || !redirectUri) {
      if (debug) {
        return debugJson("env_missing", {
          appApiKeyPresent: !!appApiKey,
          appIdPresent: !!appId,
          redirectUri,
        });
      }
      return new NextResponse(null, {
        status: 302,
        headers: new Headers({
          Location: "/login?error=whop_env_missing",
        }),
      });
    }

    const whopApi = WhopServerSdk({
      appApiKey,
      appId,
    });

    // STEP 4: exchange code with Whop
    let exchangeResult: any = null;
    let exchangeError: any = null;
    try {
      exchangeResult = await whopApi.oauth.exchangeCode({
        code,
        redirectUri,
      });
    } catch (err) {
      exchangeError = err;
    }

    // Debug mode - return exchange diagnostics
    if (debug === "3" || debug === "exchange") {
      return NextResponse.json({
        ok: !!exchangeResult && !!exchangeResult.tokens,
        stage: "exchange",
        redirectUri,
        hasTokens: !!exchangeResult?.tokens,
        tokens: exchangeResult?.tokens
          ? {
              access_token: !!exchangeResult.tokens.access_token,
              refresh_token: !!exchangeResult.tokens.refresh_token,
              expires_in: exchangeResult.tokens.expires_in ?? null,
            }
          : null,
        rawResult: exchangeResult ?? null,
        error: exchangeError
          ? {
              name: exchangeError.name,
              message: exchangeError.message,
            }
          : null,
      });
    }

    // Normal flow - handle exchange errors
    if (exchangeError) {
      if (debug) {
        return debugJson("exchange_exception", {
          message: exchangeError?.message,
          name: exchangeError?.name,
          stack: exchangeError?.stack,
        });
      }
      return new NextResponse(null, {
        status: 302,
        headers: new Headers({
          Location: "/login?error=whop_exchange_throw",
        }),
      });
    }

    if (!exchangeResult?.ok || !exchangeResult?.tokens?.access_token) {
      if (debug) {
        return debugJson("exchange_failed", { raw: exchangeResult });
      }
      return new NextResponse(null, {
        status: 302,
        headers: new Headers({
          Location: "/login?error=whop_exchange_failed",
        }),
      });
    }

    // STEP 5: create local Everly session (minimal)
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

    // Final redirect using nextPath
    const redirectTo =
      nextPath.startsWith("/") && !nextPath.startsWith("//")
        ? nextPath
        : "/overview";

    const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || url.origin;
    const redirectUrl = new URL(redirectTo, APP_BASE_URL);
    
    const finalRes = NextResponse.redirect(redirectUrl);
    
    // Clear one-time cookies (safe even if they didn't exist)
    if (stateCookieName) {
      finalRes.cookies.set({
        name: stateCookieName,
        value: "",
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
        maxAge: 0,
      });
    }
    finalRes.cookies.set({
      name: "oauth-redirect",
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
    finalRes.cookies.set({
      name: "oauth-next",
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
  } catch (err: any) {
    if (debug) {
      return debugJson("unhandled_exception", {
        message: err?.message,
        name: err?.name,
        stack: err?.stack,
      });
    }
    return NextResponse.redirect(
      new URL("/login?error=internal_error", url),
    );
  }
}
