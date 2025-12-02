import { NextRequest, NextResponse } from "next/server";
import { WhopServerSdk } from "@whop/api";
import { createSessionForMember } from "@/lib/auth/createSessionFromMember";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const debug = url.searchParams.get("debug");

  const cookies = req.cookies;
  const savedState = cookies.get("oauth_state")?.value ?? null;
  const nextPath = cookies.get("oauth_next")?.value || "/overview";

  // simple debug view
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
    });
  }

  if (!code || !stateParam) {
    return NextResponse.redirect("/login?error=missing_code");
  }

  if (!savedState || savedState !== stateParam) {
    // clear bad cookies
    const res = NextResponse.redirect("/login?error=state_mismatch");
    res.cookies.set({
      name: "oauth_state",
      value: "",
      path: "/",
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 0,
    });
    res.cookies.set({
      name: "oauth_next",
      value: "",
      path: "/",
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 0,
    });
    return res;
  }

  // -------------- exchange code with Whop --------------
  const appApiKey = process.env.WHOP_API_KEY;
  const appId = process.env.NEXT_PUBLIC_WHOP_APP_ID;
  const redirectUri = process.env.WHOP_REDIRECT_URI;

  if (!appApiKey || !appId || !redirectUri) {
    if (debug === "2") {
      return NextResponse.json({
        ok: false,
        stage: "env_missing",
        appApiKeyPresent: !!appApiKey,
        appIdPresent: !!appId,
        redirectUri,
      });
    }
    return NextResponse.redirect("/login?error=whop_env_missing");
  }

  const whopApi = WhopServerSdk({
    appApiKey,
    appId,
  });

  let exchange: any;
  try {
    exchange = await whopApi.oauth.exchangeCode({
      code,
      redirectUri,
    });
  } catch (err) {
    if (debug === "2") {
      return NextResponse.json({
        ok: false,
        stage: "exchange_error",
        error: (err as Error).message,
      });
    }
    return NextResponse.redirect("/login?error=exchange_failed");
  }

  const tokens = exchange?.tokens;
  const accessToken = tokens?.access_token;

  if (!accessToken) {
    if (debug === "2") {
      return NextResponse.json({
        ok: false,
        stage: "exchange_no_token",
        raw: exchange,
      });
    }
    return NextResponse.redirect("/login?error=no_token");
  }

  // -------------- look up / create hub + member --------------
  // Get Whop user info
  let whopUser: any;
  let whopMemberId = "whop_oauth_member";
  try {
    // Fetch user info using access token
    const userResponse = await fetch("https://api.whop.com/api/v2/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (userResponse.ok) {
      whopUser = await userResponse.json();
      whopMemberId = whopUser?.id || "whop_oauth_member";
    }
  } catch (err) {
    console.error("[OAuth Callback] Error fetching Whop user:", err);
    // Continue with fallback member ID
  }

  // Get or create hub
  const hubId =
    process.env.DEMO_HUB_ID ||
    process.env.NEXT_PUBLIC_WHOP_COMPANY_ID ||
    "whop_demo_hub";

  // Upsert member in database
  const supabase = getSupabaseServer();
  try {
    await supabase.from("members").upsert(
      {
        hub_id: hubId,
        whop_member_id: whopMemberId,
        name: whopUser?.username || whopUser?.email || "Whop User",
        role: "creator",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "hub_id,whop_member_id",
      },
    );
  } catch (err) {
    console.error("[OAuth Callback] Error upserting member:", err);
    // Continue anyway - session will still be created
  }

  const res = NextResponse.redirect(nextPath);

  // create your session cookie
  createSessionForMember(res, hubId, whopMemberId, "creator");

  // clear oauth cookies now that we're done
  res.cookies.set({
    name: "oauth_state",
    value: "",
    path: "/",
    httpOnly: true,
    sameSite: "none",
    secure: true,
    maxAge: 0,
  });
  res.cookies.set({
    name: "oauth_next",
    value: "",
    path: "/",
    httpOnly: true,
    sameSite: "none",
    secure: true,
    maxAge: 0,
  });

  return res;
}
