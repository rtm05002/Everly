import { NextRequest, NextResponse } from "next/server";
import { WhopServerSdk } from "@whop/api";
import { createServiceClient } from "@/server/db";
import { createSessionForMember } from "@/lib/auth/createSessionFromMember";
import crypto from "node:crypto";

const redirectUri = process.env.WHOP_REDIRECT_URI!;

const whopApi = WhopServerSdk({
  appApiKey: process.env.WHOP_API_KEY!,
  appId: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
});

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const searchParams = url.searchParams;
  const debug = searchParams.get("debug");
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const next = searchParams.get("next") ?? "/overview";

  // Debug mode - early return for diagnostics
  if (debug === "1") {
    return NextResponse.json({
      ok: true,
      stage: "parse_params",
      hasCode: !!code,
      hasState: !!state,
      fullUrl: req.url,
      searchParams: Object.fromEntries(searchParams.entries()),
    });
  }

  // Validate code
  if (!code) {
    return NextResponse.redirect("/login?error=missing_code");
  }

  // Wrap everything after code check in try/catch
  try {
    // Exchange code for tokens using Whop SDK
    const authResponse = await whopApi.oauth.exchangeCode({
      code: code,
      redirectUri: redirectUri,
    });

    // Debug mode - return exchangeCode result as JSON
    if (debug === "2") {
      return NextResponse.json({
        ok: authResponse.ok,
        stage: "exchange_code",
        status: (authResponse as any).status,
        error: (authResponse as any).error ?? null,
        tokensPresent: !!authResponse.tokens,
      });
    }

    // Handle exchange failure
    if (!authResponse.ok) {
      return NextResponse.redirect("/login?error=code_exchange_failed");
    }

    // Get access token
    const { access_token } = authResponse.tokens;

    // Fetch current user from Whop using access token
    const userResponse = await fetch("https://api.whop.com/api/v2/me", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      throw new Error(`Failed to fetch user: ${userResponse.status} ${userResponse.statusText} - ${errorText}`);
    }

    const whopUser = await userResponse.json();

    // Extract user ID from Whop user object
    const whopUserId = whopUser?.id || whopUser?.user_id || whopUser?.data?.id;
    if (!whopUserId) {
      throw new Error("No user ID found in Whop response");
    }

    // Derive hub_id and member_id
    const hubId = `whop:${process.env.NEXT_PUBLIC_WHOP_APP_ID}`;
    const memberId = whopUserId;
    const role = "creator";

    // Upsert hub and member in Supabase
    const db = createServiceClient();

    // Upsert hub
    const { data: h, error: hubSelectError } = await db
      .from("hubs")
      .select("id")
      .eq("creator_id", hubId)
      .maybeSingle();

    if (hubSelectError) {
      throw new Error(`Hub select error: ${hubSelectError.message}`);
    }

    let finalHubId = h?.id;
    if (!finalHubId) {
      const { data: inserted, error: hubInsertError } = await db
        .from("hubs")
        .insert({
          creator_id: hubId,
          name: `Everly Hub (${process.env.NEXT_PUBLIC_WHOP_APP_ID})`,
          settings: {},
        })
        .select("id")
        .single();

      if (hubInsertError || !inserted) {
        throw new Error(`Hub insert error: ${hubInsertError?.message || "hub insert failed"}`);
      }
      finalHubId = inserted.id;
    }

    // Upsert member
    const { data: m, error: memberSelectError } = await db
      .from("members")
      .select("id")
      .eq("hub_id", finalHubId)
      .eq("whop_member_id", memberId)
      .maybeSingle();

    if (memberSelectError) {
      throw new Error(`Member select error: ${memberSelectError.message}`);
    }

    let finalMemberId = m?.id;
    if (!finalMemberId) {
      finalMemberId = crypto.randomUUID();
      const { error: memberInsertError } = await db.from("members").insert({
        id: finalMemberId,
        hub_id: finalHubId,
        whop_member_id: memberId,
        role: role,
      });

      if (memberInsertError) {
        throw new Error(`Member insert error: ${memberInsertError.message}`);
      }
    }

    // Create session cookie and redirect
    const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://everly-ten.vercel.app";
    const redirectUrl = new URL(next, APP_BASE_URL).toString();
    const res = NextResponse.redirect(redirectUrl);

    createSessionForMember(res, finalHubId, finalMemberId, role);

    console.log("[whop-oauth-callback] Session created successfully", {
      hubId: finalHubId,
      memberId: finalMemberId,
      whopUserId,
      role,
    });

    return res;
  } catch (err) {
    if (debug === "2") {
      return NextResponse.json({
        ok: false,
        stage: "exception",
        error: (err as Error).message,
        stack: (err as Error).stack,
      }, { status: 500 });
    }
    return NextResponse.redirect("/login?error=oauth_internal_error");
  }
}
