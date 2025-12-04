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

  // DEVELOPMENT: Allow access without auth (keep current behavior)
  if (isDevelopment) {
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
    // In dev, allow access even without explicit disable flag
    return NextResponse.next();
  }

  // PRODUCTION: Enforce auth based on demo mode
  if (isProduction) {
    // PRODUCTION + DEMO MODE: Allow public access when DEMO_MODE is enabled
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

    // PRODUCTION + NORMAL MODE: Require valid Whop session
    const token = req.cookies.get("session")?.value;
    const claims = verifyToken(token);

    if (!claims) {
      // No valid session - redirect to login (not directly to OAuth to avoid loops)
      if (req.nextUrl.pathname.startsWith("/api/")) {
        return new NextResponse(JSON.stringify({ ok: false, error: "unauthorized" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        });
      }

      // Redirect to login page (which will handle OAuth initiation)
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Valid session - set headers and continue
    const response = NextResponse.next();
    response.headers.set("x-hub-id", claims.hub_id);
    response.headers.set("x-member-id", claims.member_id);
    response.headers.set("x-role", claims.role);

    return response;
  }

  // Fallback: allow access (shouldn't reach here, but safe default)
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

