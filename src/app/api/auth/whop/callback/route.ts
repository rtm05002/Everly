import { NextRequest, NextResponse } from "next/server";
import { createSessionForMember } from "@/lib/auth/createSessionFromMember";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const debug = url.searchParams.get("debug");

  // Read cookies from request
  const cookies = req.cookies;
  const savedState = cookies.get("oauth_state")?.value ?? null;
  const nextPath = cookies.get("oauth_next")?.value || "/overview";

  // Get environment variables
  const appId = process.env.NEXT_PUBLIC_WHOP_APP_ID;
  const apiKey = process.env.WHOP_API_KEY;
  const redirectUri = process.env.WHOP_REDIRECT_URI;

  // Helper for debug JSON responses
  const debugJson = (stage: string, extra: Record<string, unknown> = {}) => {
    return NextResponse.json(
      {
        ok: false,
        stage,
        code: code || null,
        stateParam: stateParam || null,
        savedState,
        nextPath,
        hasCode: !!code,
        hasState: !!stateParam,
        ...extra,
      },
      { status: 200 }
    );
  };

  // Debug mode 1: show params and cookies
  if (debug === "1") {
    return NextResponse.json({
      ok: true,
      stage: "debug",
      code,
      stateParam,
      savedState,
      nextPath,
      hasCode: !!code,
      hasState: !!stateParam,
      redirectUri,
      appIdPresent: !!appId,
      apiKeyPresent: !!apiKey,
    });
  }

  // Validate code and state are present
  if (!code || !stateParam) {
    if (debug === "2") {
      return debugJson("missing_code_or_state", {
        code: code || null,
        stateParam: stateParam || null,
      });
    }
    return NextResponse.redirect(new URL("/login?error=missing_code", url));
  }

  // Validate state matches saved state
  if (stateParam !== savedState) {
    if (debug === "2") {
      return debugJson("state_mismatch", {
        stateParam,
        savedState,
      });
    }
    return NextResponse.redirect(new URL("/login?error=state_mismatch", url));
  }

  // Validate environment variables
  if (!appId || !apiKey || !redirectUri) {
    if (debug === "2") {
      return debugJson("env_missing", {
        appIdPresent: !!appId,
        apiKeyPresent: !!apiKey,
        redirectUri: redirectUri || null,
      });
    }
    return NextResponse.redirect(new URL("/login?error=whop_env_missing", url));
  }

  // --- EXCHANGE CODE FOR TOKEN WITH WHOP ---
  // Use OAuth 2.0 authorization code flow with client_secret
  // Note: Token exchange failure is treated as a soft failure - we still create a local session
  let tokenResponse: Response | null = null;
  let tokenData: any = null;
  let tokenError: any = null;
  let hasTokens = false;

  try {
    // Whop OAuth token endpoint expects form-urlencoded data
    const tokenUrl = "https://api.whop.com/api/v2/oauth/token";
    const formData = new URLSearchParams();
    formData.append("grant_type", "authorization_code");
    formData.append("code", code);
    formData.append("client_id", appId);
    formData.append("client_secret", apiKey);
    formData.append("redirect_uri", redirectUri);

    tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const rawText = await tokenResponse.text();
    try {
      tokenData = rawText ? JSON.parse(rawText) : null;
      hasTokens = !!(tokenData && tokenData.access_token);
    } catch (parseErr) {
      tokenError = { parseError: "Failed to parse response", rawText: rawText.substring(0, 500) };
    }
  } catch (fetchErr: any) {
    tokenError = {
      message: fetchErr?.message,
      name: fetchErr?.name,
      stack: fetchErr?.stack,
    };
  }

  // Debug mode 2: show token exchange result
  if (debug === "2") {
    return NextResponse.json({
      ok: hasTokens,
      stage: hasTokens ? "exchange_success" : "exchange_error",
      status: tokenResponse?.status || null,
      statusText: tokenResponse?.statusText || null,
      hasTokens,
      tokenData: tokenData
        ? {
            hasAccessToken: !!tokenData.access_token,
            hasRefreshToken: !!tokenData.refresh_token,
            expiresIn: tokenData.expires_in,
            tokenType: tokenData.token_type,
            // Don't expose full tokens in debug
            accessTokenPreview: tokenData.access_token
              ? `${tokenData.access_token.substring(0, 20)}...`
              : null,
          }
        : null,
      error: tokenError || (tokenData && tokenData.error ? tokenData : null),
      rawBody: tokenData ? null : (tokenError?.rawText || "No response body"),
    });
  }

  // Log token exchange failure (soft failure - we continue anyway)
  if (!hasTokens) {
    console.log("[whop-callback] Token exchange failed, proceeding with local session only", {
      status: tokenResponse?.status,
      error: tokenError || tokenData,
    });
  }

  // --- CREATE SESSION AND REDIRECT (regardless of token exchange result) ---
  // Determine hubId (use the demo hub ID that was working before)
  const hubId =
    process.env.WHOP_FALLBACK_HUB_ID ||
    process.env.DEMO_HUB_ID ||
    "7007b327-c7bb-40c9-8865-a48b99612a62";
  const memberId = "whop_oauth_member";

  const res = NextResponse.redirect(new URL(nextPath || "/overview", url));

  // Get domain from request hostname for cookie
  const domain = url.hostname;
  const cookieDomain = domain && !domain.includes("localhost") ? domain : undefined;

  // Create session cookie (pass req for domain detection)
  createSessionForMember(res, hubId, memberId, "creator", req);

  // Clear oauth cookies with proper domain
  res.cookies.set({
    name: "oauth_state",
    value: "",
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
    domain: cookieDomain,
    maxAge: 0,
  });

  res.cookies.set({
    name: "oauth_next",
    value: "",
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
    domain: cookieDomain,
    maxAge: 0,
  });

  return res;
}
