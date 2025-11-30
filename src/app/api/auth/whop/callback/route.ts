// src/app/api/auth/whop/callback/route.ts

import { NextRequest, NextResponse } from "next/server";
import { WhopServerSdk } from "@whop/api";
import { createServiceClient } from "@/server/db";
import { createSessionForMember } from "@/lib/auth/createSessionFromMember";
import crypto from "node:crypto";

const whopApi = WhopServerSdk({
  appApiKey: process.env.WHOP_API_KEY!,
  appId: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
});

const REDIRECT_URI = process.env.WHOP_REDIRECT_URI!;
const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://everly-ten.vercel.app";

// Helper: build absolute URL from a path
function makeUrl(path: string) {
  return new URL(path, APP_BASE_URL).toString();
}

// Helper: return JSON error response for debug=2
function debugError(stage: string, error: any, status = 500) {
  return NextResponse.json(
    {
      ok: false,
      stage,
      error: error instanceof Error ? error.message : String(error),
      ...(error instanceof Error && error.stack ? { stack: error.stack } : {}),
      ...(typeof error === "object" && error !== null && "status" in error
        ? { status: error.status }
        : {}),
      ...(typeof error === "object" && error !== null && "body" in error
        ? { body: error.body }
        : {}),
    },
    { status }
  );
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const debug = url.searchParams.get("debug");

    const redirectUsed = REDIRECT_URI;

    // 🔍 DEBUG PATH (what you're hitting with ?debug=1)
    if (debug === "1") {
      const cookieHeader = req.headers.get("cookie") || "";
      const stateCookieKey = state ? `oauth-state.${state}` : null;
      const stateCookie =
        stateCookieKey
          ? cookieHeader
              .split(";")
              .map((c) => c.trim())
              .find((c) => c.startsWith(`${stateCookieKey}=`)) ?? null
          : null;

      return NextResponse.json({
        ok: true,
        stage: "debug",
        hasCode: !!code,
        hasState: !!state,
        redirectUsed,
        fullUrl: url.toString(),
        searchParams: Object.fromEntries(url.searchParams.entries()),
        cookieHeader,
        stateCookieKey,
        stateCookie,
      });
    }

    // a. Parse code and state
    if (!code || !state) {
      if (debug === "2") {
        return debugError("parse_params", {
          message: "missing_code_or_state",
          code: !!code,
          state: !!state,
        });
      }
      const loginUrl = new URL("/login", APP_BASE_URL);
      loginUrl.searchParams.set("error", "missing_code_or_state");
      return NextResponse.redirect(loginUrl.toString());
    }

    // b. Validate state cookie
    const cookieHeader = req.headers.get("cookie") || "";
    const stateCookieKey = `oauth-state.${state}`;
    const stateCookie =
      cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${stateCookieKey}=`)) ?? null;

    if (!stateCookie) {
      if (debug === "2") {
        return debugError("validate_state", {
          message: "invalid_state",
          stateCookieKey,
          cookieHeader,
        });
      }
      const loginUrl = new URL("/login", APP_BASE_URL);
      loginUrl.searchParams.set("error", "invalid_state");
      return NextResponse.redirect(loginUrl.toString());
    }

    // Extract the "next" path we stored in the cookie (default to /overview)
    const rawValue = stateCookie.split("=")[1] ?? "";
    const nextPath = decodeURIComponent(rawValue || "/overview");

    // c. Exchange code for tokens with Whop
    let authResponse: any;
    try {
      authResponse = await whopApi.oauth.exchangeCode({
        code,
        redirectUri: REDIRECT_URI,
      });
    } catch (err) {
      console.error("[whop-oauth-callback] exchangeCode exception:", err);
      if (debug === "2") {
        return debugError("exchangeCode", err);
      }
      const loginUrl = new URL("/login", APP_BASE_URL);
      loginUrl.searchParams.set("error", "whop_exchange_exception");
      return NextResponse.redirect(loginUrl.toString());
    }

    if (!authResponse || !authResponse.ok) {
      const errorInfo = {
        ok: authResponse?.ok ?? false,
        status: authResponse?.status ?? authResponse?.code ?? null,
        body: authResponse?.body ?? authResponse?.raw ?? null,
      };
      console.error("[whop-oauth-callback] code exchange failed:", errorInfo);
      if (debug === "2") {
        return debugError("exchangeCode", {
          message: "code_exchange_failed",
          ...errorInfo,
        });
      }
      const loginUrl = new URL("/login", APP_BASE_URL);
      loginUrl.searchParams.set("error", "code_exchange_failed");
      return NextResponse.redirect(loginUrl.toString());
    }

    // You have access_token etc. here if you want it:
    // const { access_token } = authResponse.tokens;

    // d. Create local hub + member + session
    // Use similar logic to dev-bypass, but identify hub by Whop company/org ID or app ID
    try {
      const db = createServiceClient();

      // Determine hub identifier - use WHOP_ORG_ID if available, otherwise use app ID
      const hubIdentifier =
        process.env.WHOP_ORG_ID ||
        process.env.NEXT_PUBLIC_WHOP_COMPANY_ID ||
        `whop_${process.env.NEXT_PUBLIC_WHOP_APP_ID || "app"}`;

      const orgName = process.env.WHOP_ORG_ID
        ? `Everly Hub (${process.env.WHOP_ORG_ID})`
        : `Everly Hub (${process.env.NEXT_PUBLIC_WHOP_APP_ID || "app"})`;

      // Find or create hub
      const { data: h, error: hubSelectError } = await db
        .from("hubs")
        .select("id")
        .eq("creator_id", hubIdentifier)
        .maybeSingle();

      if (hubSelectError) {
        console.error("[whop-oauth-callback] hub select error:", hubSelectError);
        if (debug === "2") {
          return debugError("hub_select", hubSelectError);
        }
        const loginUrl = new URL("/login", APP_BASE_URL);
        loginUrl.searchParams.set("error", "hub_select_failed");
        return NextResponse.redirect(loginUrl.toString());
      }

      let hubId = h?.id;
      if (!hubId) {
        const { data: inserted, error: hubInsertError } = await db
          .from("hubs")
          .insert({
            creator_id: hubIdentifier,
            name: orgName,
            settings: {},
          })
          .select("id")
          .single();

        if (hubInsertError || !inserted) {
          console.error(
            "[whop-oauth-callback] hub insert error:",
            hubInsertError
          );
          if (debug === "2") {
            return debugError("hub_insert", hubInsertError || "hub insert failed");
          }
          const loginUrl = new URL("/login", APP_BASE_URL);
          loginUrl.searchParams.set("error", "hub_insert_failed");
          return NextResponse.redirect(loginUrl.toString());
        }
        hubId = inserted.id;
      }

      // For now, use a single creator member (similar to dev-bypass)
      // In the future, we can fetch the actual Whop user from the access token
      const memberWhopId = hubIdentifier; // Use same identifier for now

      // Find or create member
      const { data: m, error: memberSelectError } = await db
        .from("members")
        .select("id")
        .eq("hub_id", hubId)
        .eq("whop_member_id", memberWhopId)
        .maybeSingle();

      if (memberSelectError) {
        console.error(
          "[whop-oauth-callback] member select error:",
          memberSelectError
        );
        if (debug === "2") {
          return debugError("member_select", memberSelectError);
        }
        const loginUrl = new URL("/login", APP_BASE_URL);
        loginUrl.searchParams.set("error", "member_select_failed");
        return NextResponse.redirect(loginUrl.toString());
      }

      let memberId = m?.id;
      if (!memberId) {
        memberId = crypto.randomUUID();
        const { error: memberInsertError } = await db.from("members").insert({
          id: memberId,
          hub_id: hubId,
          whop_member_id: memberWhopId,
          role: "creator",
        });

        if (memberInsertError) {
          console.error(
            "[whop-oauth-callback] member insert error:",
            memberInsertError
          );
          if (debug === "2") {
            return debugError("member_insert", memberInsertError);
          }
          const loginUrl = new URL("/login", APP_BASE_URL);
          loginUrl.searchParams.set("error", "member_insert_failed");
          return NextResponse.redirect(loginUrl.toString());
        }
      }

      // Create redirect response
      const redirectUrl = makeUrl(nextPath || "/overview");
      const res = NextResponse.redirect(redirectUrl);

      // Create session using helper
      const sessionToken = createSessionForMember(res, hubId, memberId, "creator");
      
      console.log("[whop-oauth-callback] Session created successfully", {
        hubId,
        memberId,
        role: "creator",
        redirectUrl,
        hasToken: !!sessionToken,
      });

      // e. Clean up OAuth cookies
      res.cookies.set({
        name: stateCookieKey,
        value: "",
        path: "/",
        maxAge: 0,
      });
      res.cookies.set({
        name: "oauth-redirect",
        value: "",
        path: "/",
        maxAge: 0,
      });

      return res;
    } catch (err) {
      console.error("[whop-oauth-callback] hub/member creation error:", err);
      if (debug === "2") {
        return debugError("hub_member_creation", err);
      }
      const loginUrl = new URL("/login", APP_BASE_URL);
      loginUrl.searchParams.set("error", "hub_member_creation_failed");
      return NextResponse.redirect(loginUrl.toString());
    }
  } catch (err) {
    console.error("[whop-oauth-callback] unexpected error:", err);
    const url = new URL(req.url);
    const debug = url.searchParams.get("debug");
    if (debug === "2") {
      return debugError("exception", err);
    }
    const loginUrl = new URL("/login", APP_BASE_URL);
    loginUrl.searchParams.set("error", "callback_failed");
    return NextResponse.redirect(loginUrl.toString());
  }
}
