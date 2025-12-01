import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { WhopServerSdk } from "@whop/api";
import { signJwt } from "@/lib/jwt";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const search = url.searchParams;
  const debug = search.get("debug");
  const code = search.get("code");
  const state = search.get("state");

  const baseDebug = {
    fullUrl: url.toString(),
    searchParams: Object.fromEntries(search.entries()),
    cookieHeader: req.headers.get("cookie") || null,
  };

  const debugJson = (stage: string, extra: Record<string, unknown> = {}) =>
    NextResponse.json(
      { ok: false, stage, ...baseDebug, ...extra },
      { status: 200 },
    );

  try {
    // STEP 1: basic param check
    if (!code || !state) {
      if (debug) {
        return debugJson("missing_code_or_state", { code, state });
      }
      return NextResponse.redirect(
        new URL("/login?error=missing_code", url),
      );
    }

    // STEP 2: read cookies
    const cookieStore = await cookies();
    const stateCookieName = `oauth-state.${state}`;
    const stateCookie = cookieStore.get(stateCookieName);
    const nextPath = stateCookie?.value || "/overview";

    if (debug === "1") {
      return debugJson("parse_params", {
        codePresent: !!code,
        statePresent: !!state,
        state,
        stateCookieName,
        stateCookieExists: !!stateCookie,
        nextPath,
      });
    }

    // STEP 3: state check - verify the state cookie exists
    if (!stateCookie) {
      if (debug) {
        return debugJson("state_mismatch", {
          state,
          stateCookieName,
          stateCookieExists: false,
        });
      }
      return NextResponse.redirect(
        new URL("/login?error=state_mismatch", url),
      );
    }

    // Prepare response object so we can set/clear cookies
    const resHeaders = new Headers();

    // Clear one-time cookies
    resHeaders.append(
      "Set-Cookie",
      `${stateCookieName}=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0`,
    );
    resHeaders.append(
      "Set-Cookie",
      "oauth-redirect=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0",
    );

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
    let authResponse: any;
    try {
      authResponse = await whopApi.oauth.exchangeCode({
        code,
        redirectUri,
      });
    } catch (err: any) {
      if (debug) {
        return debugJson("exchange_exception", {
          message: err?.message,
          name: err?.name,
          stack: err?.stack,
        });
      }
      return new NextResponse(null, {
        status: 302,
        headers: new Headers({
          Location: "/login?error=whop_exchange_throw",
        }),
      });
    }

    if (debug === "2") {
      return debugJson("exchange_result", {
        raw: authResponse,
        okField: authResponse?.ok ?? null,
        tokensPresent: !!authResponse?.tokens,
      });
    }

    if (!authResponse?.ok || !authResponse?.tokens?.access_token) {
      if (debug) {
        return debugJson("exchange_failed", { raw: authResponse });
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

    resHeaders.append(
      "Set-Cookie",
      [
        "session=" + sessionJwt,
        "Path=/",
        "HttpOnly",
        "Secure",
        "SameSite=None",
        "Max-Age=" + 60 * 60 * 24 * 7,
      ].join("; "),
    );

    const redirectTo =
      nextPath.startsWith("/") && !nextPath.startsWith("//")
        ? nextPath
        : "/overview";

    resHeaders.set("Location", redirectTo);
    return new NextResponse(null, {
      status: 302,
      headers: resHeaders,
    });
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
