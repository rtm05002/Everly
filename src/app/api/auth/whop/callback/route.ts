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
  try {
    // 1. Parse URL and query params
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const debug = searchParams.get("debug");
    const next = searchParams.get("next") ?? "/overview";

    // 2. Debug mode
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

    // 3. Validate code
    if (!code) {
      return NextResponse.redirect("/login?error=missing_code");
    }

    // 4. Exchange code for tokens using Whop SDK
    const authResponse = await whopApi.oauth.exchangeCode({
      code: code,
      redirectUri: redirectUri,
    });

    // 5. Handle exchange failure
    if (!authResponse.ok) {
      if (debug === "1" || debug === "2") {
        return NextResponse.json({
          ok: false,
          stage: "exchange_code",
          status: authResponse.status,
          error: authResponse.error ?? "exchange_failed",
        });
      }
      return NextResponse.redirect("/login?error=code_exchange_failed");
    }

    // 6. Get access token
    const { access_token } = authResponse.tokens;

    // 7. Fetch current user from Whop using access token
    // Create an authenticated SDK instance with the access token
    const authenticatedWhopApi = WhopServerSdk({
      appApiKey: process.env.WHOP_API_KEY!,
      appId: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
      accessToken: access_token,
    });

    // Fetch user - try common SDK methods
    let whopUser: any;
    try {
      // Try the users.me() method if available
      if (authenticatedWhopApi.users?.me) {
        whopUser = await authenticatedWhopApi.users.me();
      } else {
        // Fallback: make direct API call
        const userResponse = await fetch("https://api.whop.com/api/v2/me", {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        });
        if (!userResponse.ok) {
          throw new Error(`Failed to fetch user: ${userResponse.status}`);
        }
        whopUser = await userResponse.json();
      }
    } catch (err) {
      console.error("[whop-oauth-callback] Failed to fetch user:", err);
      if (debug === "1" || debug === "2") {
        return NextResponse.json({
          ok: false,
          stage: "fetch_user",
          error: err instanceof Error ? err.message : String(err),
        });
      }
      return NextResponse.redirect("/login?error=fetch_user_failed");
    }

    // 8. Extract user ID from Whop user object
    const whopUserId = whopUser?.id || whopUser?.user_id || whopUser?.data?.id;
    if (!whopUserId) {
      console.error("[whop-oauth-callback] No user ID in Whop response:", whopUser);
      if (debug === "1" || debug === "2") {
        return NextResponse.json({
          ok: false,
          stage: "extract_user_id",
          error: "No user ID found in Whop response",
          whopUser,
        });
      }
      return NextResponse.redirect("/login?error=no_user_id");
    }

    // 9. Derive hub_id and member_id
    const hubId = `whop:${process.env.NEXT_PUBLIC_WHOP_APP_ID}`;
    const memberId = whopUserId;
    const role = "creator";

    // 10. Upsert hub and member in Supabase (reuse dev-bypass pattern)
    const db = createServiceClient();

    // Upsert hub
    const { data: h, error: hubSelectError } = await db
      .from("hubs")
      .select("id")
      .eq("creator_id", hubId)
      .maybeSingle();

    if (hubSelectError) {
      console.error("[whop-oauth-callback] hub select error:", hubSelectError);
      if (debug === "1" || debug === "2") {
        return NextResponse.json({
          ok: false,
          stage: "hub_select",
          error: hubSelectError.message,
        });
      }
      return NextResponse.redirect("/login?error=hub_select_failed");
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
        console.error("[whop-oauth-callback] hub insert error:", hubInsertError);
        if (debug === "1" || debug === "2") {
          return NextResponse.json({
            ok: false,
            stage: "hub_insert",
            error: hubInsertError?.message || "hub insert failed",
          });
        }
        return NextResponse.redirect("/login?error=hub_insert_failed");
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
      console.error("[whop-oauth-callback] member select error:", memberSelectError);
      if (debug === "1" || debug === "2") {
        return NextResponse.json({
          ok: false,
          stage: "member_select",
          error: memberSelectError.message,
        });
      }
      return NextResponse.redirect("/login?error=member_select_failed");
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
        console.error("[whop-oauth-callback] member insert error:", memberInsertError);
        if (debug === "1" || debug === "2") {
          return NextResponse.json({
            ok: false,
            stage: "member_insert",
            error: memberInsertError.message,
          });
        }
        return NextResponse.redirect("/login?error=member_insert_failed");
      }
    }

    // 11. Create session cookie and redirect
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
    console.error("[whop-oauth-callback] unexpected error:", err);
    const url = new URL(req.url);
    const debug = url.searchParams.get("debug");
    if (debug === "1" || debug === "2") {
      return NextResponse.json({
        ok: false,
        stage: "exception",
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : null,
      });
    }
    return NextResponse.redirect("/login?error=callback_failed");
  }
}
