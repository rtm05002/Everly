import { NextResponse, NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/session";
import { DEMO_MODE, DEMO_HUB_ID } from "@/lib/env.server";

const BYPASS = [
  "/api/auth/whop/start",
  "/api/auth/whop/callback",
  "/api/health",
  "/widget",
];

const PUBLIC_PATHS = new Set<string>(["/", "/login", "/api/widget/chat", "/api/widget/session", "/favicon.ico"]);

function isPublic(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/_next") || pathname.startsWith("/assets") || pathname.startsWith("/images")) {
    return true;
  }
  for (const path of PUBLIC_PATHS) {
    if (pathname === path || pathname.startsWith(`${path}/`)) {
      return true;
    }
  }
  return false;
}

export function middleware(req: NextRequest) {
  const disableAuth = process.env.NEXT_PUBLIC_DISABLE_AUTH === "true";
  if (disableAuth) {
    const requestHeaders = new Headers(req.headers);
    // In demo mode, always use DEMO_HUB_ID
    const hubId = DEMO_MODE && DEMO_HUB_ID ? DEMO_HUB_ID : (process.env.NEXT_PUBLIC_DEV_HUB_ID || process.env.DEMO_HUB_ID || "dev-hub");
    // Use a valid UUID format for demo member ID
    const memberId = process.env.NEXT_PUBLIC_DEV_MEMBER_ID || "00000000-0000-0000-0000-000000000001";
    requestHeaders.set("x-hub-id", hubId);
    requestHeaders.set("x-member-id", memberId);
    requestHeaders.set("x-role", "creator");
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  const { pathname } = req.nextUrl;

  if (BYPASS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (isPublic(req)) {
    return NextResponse.next();
  }

  const token = req.cookies.get("session")?.value;
  const claims = verifyToken(token);

  if (!claims) {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return new NextResponse(JSON.stringify({ ok: false, error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  // In demo mode, always use DEMO_HUB_ID (override claims)
  const effectiveHubId = DEMO_MODE && DEMO_HUB_ID ? DEMO_HUB_ID : claims.hub_id;
  response.headers.set("x-hub-id", effectiveHubId);
  response.headers.set("x-member-id", claims.member_id);
  response.headers.set("x-role", claims.role);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

