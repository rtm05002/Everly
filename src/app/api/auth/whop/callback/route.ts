import { NextResponse } from "next/server";
import { WhopServerSdk } from "@whop/api";

export const runtime = "nodejs";

const whop = WhopServerSdk({
  appApiKey: process.env.WHOP_API_KEY!,
  appId: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
});

function j(status: number, obj: Record<string, unknown>) {
  return NextResponse.json(obj, { status });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const debug = url.searchParams.get("debug") === "1";

  if (!code || !state) {
    return j(400, { ok: false, stage: "parse_params", error: "missing_code_or_state" });
  }

  const stateCookie = req.headers
    .get("Cookie")
    ?.split(";")
    .find((c) => c.trim().startsWith(`oauth-state.${state}=`));
  const next = stateCookie ? decodeURIComponent(stateCookie.split("=")[1]) : "/overview";

  const redirectUri = process.env.WHOP_REDIRECT_URI!;

  const authResponse = await whop.oauth.exchangeCode({ code, redirectUri });
  if (!authResponse.ok) {
    const status = (authResponse as any).status ?? 400;
    const body = (authResponse as any).body ?? (authResponse as any).error ?? null;
    return j(400, {
      ok: false,
      stage: "exchangeCode",
      redirectUsed: redirectUri,
      codeLen: code.length,
      status,
      body,
      stateCookiePresent: !!stateCookie,
    });
  }

  const { access_token } = authResponse.tokens;
  if (debug) {
    return j(200, { ok: true, stage: "exchangeCode", gotToken: !!access_token });
  }

  return NextResponse.redirect(new URL(next, url.origin), 302);
}
