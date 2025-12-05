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

  // Helper to clear OAuth cookies
  const clearOAuthCookies = (res: NextResponse) => {
    const domain = url.hostname;
    const cookieDomain = domain && !domain.includes("localhost") ? domain : undefined;

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
    const res = NextResponse.redirect(new URL("/login?error=whop_missing_code", url));
    clearOAuthCookies(res);
    if (debug === "2") {
      return NextResponse.json({
        ok: false,
        stage: "missing_code_or_state",
        code: code || null,
        stateParam: stateParam || null,
        savedState,
        nextPath,
      });
    }
    return res;
  }

  // Validate state matches saved state
  if (!savedState || stateParam !== savedState) {
    const res = NextResponse.redirect(new URL("/login?error=whop_state_mismatch", url));
    clearOAuthCookies(res);
    if (debug === "2") {
      return NextResponse.json({
        ok: false,
        stage: "state_mismatch",
        stateParam,
        savedState,
        nextPath,
      });
    }
    return res;
  }

  // Validate environment variables
  if (!appId || !apiKey || !redirectUri) {
    const res = NextResponse.redirect(new URL("/login?error=whop_env_missing", url));
    clearOAuthCookies(res);
    if (debug === "2") {
      return NextResponse.json({
        ok: false,
        stage: "env_missing",
        appIdPresent: !!appId,
        apiKeyPresent: !!apiKey,
        redirectUri: redirectUri || null,
      });
    }
    return res;
  }

  // --- EXCHANGE CODE FOR TOKEN WITH WHOP ---
  let tokenResponse: Response | null = null;
  let tokenData: any = null;
  let tokenError: any = null;
  let accessToken: string | null = null;

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
      accessToken = tokenData?.access_token || null;
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

  // Check if token exchange succeeded
  if (!tokenResponse?.ok || !accessToken) {
    const res = NextResponse.redirect(new URL("/login?error=whop_exchange_failed", url));
    clearOAuthCookies(res);
    if (debug === "2") {
      return NextResponse.json({
        ok: false,
        stage: "exchange_failed",
        status: tokenResponse?.status || null,
        statusText: tokenResponse?.statusText || null,
        raw: {
          status: tokenResponse?.status,
          body: tokenError || tokenData,
        },
      });
    }
    return res;
  }

  // Debug mode 2: show token exchange result (before fetching user)
  if (debug === "2" && !tokenData?.access_token) {
    return NextResponse.json({
      ok: false,
      stage: "exchange_failed",
      status: tokenResponse?.status || null,
      statusText: tokenResponse?.statusText || null,
      raw: {
        status: tokenResponse?.status,
        body: tokenError || tokenData,
      },
    });
  }

  // --- FETCH USER IDENTITY FROM WHOP ---
  let meData: any = null;
  let meError: any = null;

  try {
    const meResponse = await fetch("https://api.whop.com/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!meResponse.ok) {
      meError = {
        status: meResponse.status,
        statusText: meResponse.statusText,
      };
    } else {
      meData = await meResponse.json();
    }
  } catch (fetchErr: any) {
    meError = {
      message: fetchErr?.message,
      name: fetchErr?.name,
    };
  }

  // Extract user identity
  const memberId = meData?.id || "whop_oauth_member";
  const email = meData?.email || undefined;
  const username = meData?.username || undefined;
  const avatar_url = meData?.avatar_url || undefined;

  // Determine hubId from user's hubs
  let hubId: string | null = null;
  if (meData?.hubs && Array.isArray(meData.hubs) && meData.hubs.length > 0) {
    // Use the first hub (or find one that matches our app)
    hubId = meData.hubs[0]?.id || meData.hubs[0]?.hub_id || null;
  }

  // Fallback to DEMO_HUB_ID if no hub found
  if (!hubId) {
    hubId =
      process.env.WHOP_FALLBACK_HUB_ID ||
      process.env.DEMO_HUB_ID ||
      "7007b327-c7bb-40c9-8865-a48b99612a62";
  }

  // Determine role: creator if they own the hub, otherwise member
  let role: "creator" | "moderator" | "member" = "member";
  if (meData?.hubs && Array.isArray(meData.hubs)) {
    const hub = meData.hubs.find((h: any) => h.id === hubId || h.hub_id === hubId);
    if (hub?.role === "owner" || hub?.role === "admin") {
      role = "creator";
    } else if (hub?.role === "moderator") {
      role = "moderator";
    }
  }

  // Debug mode 2: show what we would create (without redirecting)
  if (debug === "2") {
    return NextResponse.json({
      ok: true,
      stage: "would_create_session",
      code,
      stateParam,
      savedState,
      hubId,
      memberId,
      email,
      username,
      nextPath,
      meData: meData
        ? {
            id: meData.id,
            email: meData.email,
            username: meData.username,
            hasHubs: !!(meData.hubs && meData.hubs.length > 0),
            hubCount: meData.hubs?.length || 0,
          }
        : null,
      meError,
    });
  }

  // --- CREATE SESSION AND REDIRECT ---
  const res = NextResponse.redirect(new URL(nextPath || "/overview", url));

  // Create session cookie with identity
  createSessionForMember(
    res,
    hubId,
    memberId,
    role,
    req,
    {
      email,
      username,
      avatar_url,
    }
  );

  // Clear OAuth cookies
  clearOAuthCookies(res);

  return res;
}
