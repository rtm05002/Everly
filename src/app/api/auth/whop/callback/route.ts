import { NextRequest, NextResponse } from "next/server";
import { createSessionForMember } from "@/lib/auth/createSessionFromMember";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const debug = url.searchParams.get("debug");

  // Read cookies from request
  const cookies = req.cookies;
  const savedState = cookies.get("oauth_state")?.value ?? null;
  const nextPath = cookies.get("oauth_next")?.value || "/overview";

  // Debug mode 1: show params and cookies
  if (debug === "1") {
    return NextResponse.json({
      ok: true,
      stage: "debug",
      code,
      stateParam: state,
      savedState,
      nextPath,
      hasCode: !!code,
      hasState: !!state,
    });
  }

  // Validate code and state are present
  if (!code || !state) {
    if (debug === "2") {
      return NextResponse.json({
        ok: false,
        stage: "state_mismatch",
        code,
        stateParam: state,
        savedState,
        nextPath,
      });
    }
    return NextResponse.redirect("/login?error=state_mismatch");
  }

  // Validate state matches saved state
  if (state !== savedState) {
    if (debug === "2") {
      return NextResponse.json({
        ok: false,
        stage: "state_mismatch",
        code,
        stateParam: state,
        savedState,
        nextPath,
      });
    }
    return NextResponse.redirect("/login?error=state_mismatch");
  }

  // Debug mode 2: show what we would do (without actually redirecting)
  if (debug === "2") {
    const hubId =
      process.env.WHOP_FALLBACK_HUB_ID ||
      process.env.DEMO_HUB_ID ||
      "demo_hub";
    const memberId = "whop_oauth_member";

    return NextResponse.json({
      ok: true,
      stage: "would_create_session",
      code,
      stateParam: state,
      savedState,
      hubId,
      memberId,
      nextPath,
    });
  }

  // State is valid - create session and redirect
  const hubId =
    process.env.WHOP_FALLBACK_HUB_ID ||
    process.env.DEMO_HUB_ID ||
    "demo_hub";
  const memberId = "whop_oauth_member";

  const res = NextResponse.redirect(nextPath || "/overview");

  // Create session cookie
  createSessionForMember(res, hubId, memberId, "creator");

  // Clear oauth cookies
  res.cookies.set({
    name: "oauth_state",
    value: "",
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
    maxAge: 0,
  });

  res.cookies.set({
    name: "oauth_next",
    value: "",
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
    maxAge: 0,
  });

  return res;
}
