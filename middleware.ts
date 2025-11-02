import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getRateLimitConfig } from "./src/lib/rate-limit";

const PROTECTED = [
  "/overview",
  "/ai-assistant",
  "/bounties",
  "/insights",
  "/automation",
  "/members",
  "/settings",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

  // Handle rate limiting for specific API endpoints
  const rateLimitConfig = getRateLimitConfig(pathname);
  if (rateLimitConfig) {
    const result = checkRateLimit(ip, pathname, rateLimitConfig);
    
    if (!result.allowed) {
      const headers: Record<string, string> = {
        'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': Math.ceil((Date.now() + rateLimitConfig.windowMs) / 1000).toString(),
      };

      if (result.retryAfter) {
        headers['Retry-After'] = result.retryAfter.toString();
      }

      return NextResponse.json(
        { 
          error: "Too many requests. Please try again later.",
          retryAfter: result.retryAfter 
        },
        { status: 429, headers }
      );
    }
  }

  // Skip rate limiting for static assets and other non-API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/health") ||
    pathname === "/" ||
    pathname.startsWith("/widget")
  ) {
    return NextResponse.next();
  }

  // Handle protected routes
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!isProtected) return NextResponse.next();

  // In development mode, automatically allow access
  const isDevelopment = process.env.NODE_ENV === "development";
  if (isDevelopment) {
    return NextResponse.next();
  }

  // In production, check for dev cookie or proper auth
  const dev = req.cookies.get("everly_dev")?.value === "1";
  if (dev) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/overview/:path*",
    "/ai-assistant/:path*",
    "/bounties/:path*",
    "/insights/:path*",
    "/automation/:path*",
    "/members/:path*",
    "/settings/:path*",
    "/api/hub/:hubId/ai/query",
    "/api/widget/session",
  ],
};
