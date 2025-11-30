export const runtime = "nodejs";
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { WhopServerSdk } from "@whop/api";
import { createServiceClient } from "@/server/db";
import { signJwt } from "@/lib/jwt";

function isLocalhost(u: URL) {
  return u.hostname === "localhost" || u.hostname.startsWith("127.");
}

const whop = WhopServerSdk({
  appApiKey: process.env.WHOP_API_KEY!,
  appId: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next") ?? "/overview";

  const devBypass =
    process.env.WHOP_OAUTH_DEV_BYPASS === "true" &&
    process.env.NODE_ENV !== "production" &&
    isLocalhost(url);

  if (devBypass) {
    try {
      const creatorWhopId = `dev_${process.env.NEXT_PUBLIC_WHOP_APP_ID || "app"}`;
      const orgName = "Everly Dev Hub (Bypass)";
      const db = createServiceClient();

      const { data: h, error: hubSelectError } = await db
        .from("hubs")
        .select("id")
        .eq("creator_id", creatorWhopId)
        .maybeSingle();
      if (hubSelectError) {
        return new NextResponse(hubSelectError.message, { status: 500 });
      }

      let hubId = h?.id;
      if (!hubId) {
        const { data: inserted, error: hubInsertError } = await db
          .from("hubs")
          .insert({ creator_id: creatorWhopId, name: orgName, settings: { bypass: true } })
          .select("id")
          .single();
        if (hubInsertError || !inserted) {
          return new NextResponse(hubInsertError?.message || "hub insert failed", { status: 500 });
        }
        hubId = inserted.id;
      }

      const { data: m, error: memberSelectError } = await db
        .from("members")
        .select("id")
        .eq("hub_id", hubId)
        .eq("whop_member_id", creatorWhopId)
        .maybeSingle();
      if (memberSelectError) {
        return new NextResponse(memberSelectError.message, { status: 500 });
      }

      let memberId = m?.id;
      if (!memberId) {
        memberId = crypto.randomUUID();
        const { error: memberInsertError } = await db.from("members").insert({
          id: memberId,
          hub_id: hubId,
          whop_member_id: creatorWhopId,
          role: "creator",
        });
        if (memberInsertError) {
          return new NextResponse(memberInsertError.message, { status: 500 });
        }
      }

      const jwt = signJwt({ hub_id: hubId, role: "creator", member_id: memberId });
      const res = NextResponse.redirect(new URL(next, url.origin), 302);
      res.headers.append(
        "Set-Cookie",
        `session=${jwt}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`,
      );
      return res;
    } catch (err: any) {
      return new NextResponse(err?.message || "bypass_failed", { status: 500 });
    }
  }

  const redirectUri = process.env.WHOP_REDIRECT_URI;
  if (!process.env.WHOP_API_KEY || !process.env.NEXT_PUBLIC_WHOP_APP_ID || !redirectUri) {
    return NextResponse.redirect("/login?error=whop_env_missing");
  }

  // Debug mode: return JSON instead of redirecting
  const debug = url.searchParams.get("debug") === "1";
  if (debug) {
    const { url: authorizeUrl, state } = whop.oauth.getAuthorizationUrl({
      redirectUri,
      scope: ["read_user"],
    });
    return NextResponse.json({
      ok: true,
      stage: "start",
      redirectUri,
      authorizeUrl,
      state,
      appId: process.env.NEXT_PUBLIC_WHOP_APP_ID,
      apiKeyPresent: !!process.env.WHOP_API_KEY,
      redirectUriPresent: !!redirectUri,
    });
  }

  const { url: authorizeUrl, state } = whop.oauth.getAuthorizationUrl({
    redirectUri,
    scope: ["read_user"],
  });

  const res = NextResponse.redirect(authorizeUrl, 302);
  res.headers.append(
    "Set-Cookie",
    `oauth-state.${state}=${encodeURIComponent(next)}; Path=/; HttpOnly; SameSite=Lax; ${
      process.env.NODE_ENV === "production" ? "Secure;" : ""
    } Max-Age=3600`,
  );
  res.headers.append(
    "Set-Cookie",
    `oauth-redirect=${encodeURIComponent(redirectUri)}; Path=/; HttpOnly; SameSite=Lax; ${
      process.env.NODE_ENV === "production" ? "Secure;" : ""
    } Max-Age=3600`,
  );
  res.headers.set("x-debug-authorize-url", authorizeUrl);
  res.headers.set("x-debug-redirect-uri", redirectUri);
  return res;
}

