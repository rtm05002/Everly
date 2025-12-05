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
  const { pathname } = req.nextUrl;
  const isProduction = process.env.NODE_ENV === "production";
  const isDevelopment = process.env.NODE_ENV === "development";

  // Always allow bypass routes
  if (BYPASS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Always allow public paths
  if (isPublic(req)) {
    return NextResponse.next();
  }

  // DEMO MODE: Allow public access when DEMO_MODE is enabled (both dev and prod)
  if (DEMO_MODE && DEMO_HUB_ID) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-hub-id", DEMO_HUB_ID);
    requestHeaders.set("x-member-id", "demo-member");
    requestHeaders.set("x-role", "creator");
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // NORMAL MODE: Require valid Whop session (both dev and prod)
  const token = req.cookies.get("session")?.value;
  const claims = verifyToken(token);

  if (!claims) {
    // No valid session - redirect to login with next param
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return new NextResponse(JSON.stringify({ ok: false, error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    // Redirect to login page with next param
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Valid session - set headers and continue
  const response = NextResponse.next();
  response.headers.set("x-hub-id", claims.hub_id);
  response.headers.set("x-member-id", claims.member_id);
  response.headers.set("x-role", claims.role);
  if (claims.email) {
    response.headers.set("x-member-email", claims.email);
  }
  if (claims.username) {
    response.headers.set("x-member-username", claims.username);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

