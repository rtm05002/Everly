// src/app/api/auth/whop/callback/route.ts

import { NextRequest, NextResponse } from "next/server";

import { WhopServerSdk } from "@whop/api";

import { signJwt } from "@/lib/jwt";



// If you already have a shared env helper, feel free to use that instead of process.env

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



export async function GET(req: NextRequest) {

  const url = new URL(req.url);

  const code = url.searchParams.get("code");

  const state = url.searchParams.get("state");

  const debug = url.searchParams.get("debug");



  const redirectUsed = REDIRECT_URI;



  // 🔍 DEBUG PATH (what you're hitting with ?debug=1)

  if (debug) {

    const cookieHeader = req.headers.get("cookie") || "";

    const stateCookieKey = `oauth-state.${state}`;

    const stateCookie =

      cookieHeader

        .split(";")

        .map((c) => c.trim())

        .find((c) => c.startsWith(`${stateCookieKey}=`)) ?? null;



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



  // 1) basic param safety

  if (!code || !state) {

    const loginUrl = new URL("/login", APP_BASE_URL);

    loginUrl.searchParams.set("error", "missing_code_or_state");

    return NextResponse.redirect(loginUrl.toString());

  }



  // 2) validate state cookie

  const cookieHeader = req.headers.get("cookie") || "";

  const stateCookieKey = `oauth-state.${state}`;

  const stateCookie =

    cookieHeader

      .split(";")

      .map((c) => c.trim())

      .find((c) => c.startsWith(`${stateCookieKey}=`)) ?? null;



  if (!stateCookie) {

    const loginUrl = new URL("/login", APP_BASE_URL);

    loginUrl.searchParams.set("error", "invalid_state");

    return NextResponse.redirect(loginUrl.toString());

  }



  // Extract the "next" path we stored in the cookie (default to /overview)

  const rawValue = stateCookie.split("=")[1] ?? "";

  const nextPath = decodeURIComponent(rawValue || "/overview");



  // 3) exchange code for tokens with Whop, but do NOT throw on failure

  let authResponse: any;

  try {

    authResponse = await whopApi.oauth.exchangeCode({

      code,

      redirectUri: REDIRECT_URI,

    });

  } catch (err) {

    const loginUrl = new URL("/login", APP_BASE_URL);

    loginUrl.searchParams.set("error", "whop_exchange_exception");

    return NextResponse.redirect(loginUrl.toString());

  }



  if (!authResponse || !authResponse.ok) {

    const loginUrl = new URL("/login", APP_BASE_URL);

    loginUrl.searchParams.set("error", "whop_code_exchange_failed");

    return NextResponse.redirect(loginUrl.toString());

  }



  // You have access_token etc. here if you want it:

  // const { access_token } = authResponse.tokens;



  // 4) create local session JWT

  // For now we can use DEMO_HUB_ID or fall back to a simple placeholder.

  const hubId =

    process.env.DEMO_HUB_ID ??

    (process.env.WHOP_HUB_ID || "whop-demo-hub-placeholder");



  const jwt = signJwt({

    hub_id: hubId,

    member_id: "whop-member",

    role: "creator",

  });



  const redirectUrl = makeUrl(nextPath || "/overview");

  const res = NextResponse.redirect(redirectUrl);



  // 5) set session cookie so middleware sees you as authenticated

  res.cookies.set({

    name: "session",

    value: jwt,

    httpOnly: true,

    sameSite: "lax",

    path: "/",

    maxAge: 60 * 60 * 24 * 7, // 7 days

  });



  // 6) clean up OAuth cookies

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

}
