// src/app/api/auth/whop/callback/route.ts

import { NextRequest, NextResponse } from "next/server";

import { WhopServerSdk } from "@whop/api";

import { signJwt } from "@/lib/jwt";

import { toBool } from "@/lib/utils";



const whopApi = WhopServerSdk({

  appApiKey: process.env.WHOP_API_KEY!,

  appId: process.env.NEXT_PUBLIC_WHOP_APP_ID!,

});



const REDIRECT_URI = process.env.WHOP_REDIRECT_URI!;



// Optional: env-driven defaults for who logs in when Whop auth succeeds

const DEFAULT_HUB_ID = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;

const DEFAULT_MEMBER_ID = process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID;



export async function GET(req: NextRequest) {

  const url = new URL(req.url);

  const code = url.searchParams.get("code") ?? undefined;

  const state = url.searchParams.get("state") ?? undefined;

  const debug = toBool(url.searchParams.get("debug") ?? "false");



  // Basic param parsing / debug info

  const searchParamsObject = Object.fromEntries(url.searchParams.entries());

  const queryString = url.search.substring(url.origin.length + url.pathname.length);



  if (debug) {

    return NextResponse.json({

      ok: false,

      stage: "parse_params",

      hasCode: Boolean(code),

      hasState: Boolean(state),

      redirectUsed: REDIRECT_URI,

      fullUrl: url.toString(),

      searchParams: searchParamsObject,

      queryString,

    });

  }



  if (!code || !state) {

    return NextResponse.redirect(

      `/login?error=missing_code_or_state&details=${encodeURIComponent(

        JSON.stringify({ hasCode: !!code, hasState: !!state })

      )}`

    );

  }



  // Recover the original "next" from the state cookie set in /auth/whop/start

  const cookies = req.headers.get("cookie") ?? "";

  const stateCookiePrefix = `oauth-state.${state}=`;

  const stateCookie = cookies

    .split(";")

    .map((c) => c.trim())

    .find((c) => c.startsWith(stateCookiePrefix));



  const nextFromState = stateCookie

    ? decodeURIComponent(stateCookie.substring(stateCookiePrefix.length))

    : "/overview";



  // Exchange code for Whop access token

  const authResponse = await whopApi.oauth.exchangeCode({

    code,

    redirectUri: REDIRECT_URI,

  });



  if (!authResponse.ok) {

    if (debug) {

      return NextResponse.json({

        ok: false,

        stage: "exchangeCode",

        error: "exchange_failed",

        redirectUsed: REDIRECT_URI,

        codeLen: code.length,

        tokenStatus: authResponse.status,

        tokenBody: authResponse.error ?? null,

      });

    }

    return NextResponse.redirect("/login?error=whop_exchange_failed");

  }



  // For v1, we skip calling Whop for profile details and just use env IDs.

  // (These are already in your env for your own company/agent.)

  const hubId = DEFAULT_HUB_ID;

  const memberId = DEFAULT_MEMBER_ID;



  if (!hubId || !memberId) {

    // If these are missing, we can't create a session. Safer to fail loudly.

    return NextResponse.redirect(

      "/login?error=missing_hub_or_member&hint=configure NEXT_PUBLIC_WHOP_COMPANY_ID and NEXT_PUBLIC_WHOP_AGENT_USER_ID"

    );

  }



  const jwt = signJwt({

    hub_id: hubId,

    member_id: memberId,

    role: "creator",

  });



  const res = NextResponse.redirect(nextFromState || "/overview");



  res.cookies.set("session", jwt, {

    httpOnly: true,

    sameSite: "lax",

    secure: process.env.NODE_ENV === "production",

    path: "/",

    maxAge: 60 * 60 * 24 * 7, // 7 days

  });



  return res;

}
