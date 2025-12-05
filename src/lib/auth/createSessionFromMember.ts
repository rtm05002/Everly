import { NextRequest, NextResponse } from "next/server";
import { signJwt, Claims } from "@/lib/jwt";

/**
 * Creates a session JWT and sets it as a cookie on the provided NextResponse.
 * Used in route handlers to authenticate users after OAuth or dev bypass.
 */
export function createSessionForMember(
  res: NextResponse,
  hubId: string,
  memberId: string,
  role: "creator" | "moderator" | "member",
  req?: NextRequest,
  identity?: {
    email?: string;
    username?: string;
    avatar_url?: string;
  }
): string {
  const claims: Claims = {
    hub_id: hubId,
    member_id: memberId,
    role,
    ...(identity?.email && { email: identity.email }),
    ...(identity?.username && { username: identity.username }),
    ...(identity?.avatar_url && { avatar_url: identity.avatar_url }),
  };

  const token = signJwt(claims);

  // Get domain from request hostname (works for both localhost and production)
  const domain = req?.nextUrl.hostname || undefined;
  // For localhost, don't set domain (browsers handle localhost differently)
  const cookieDomain = domain && !domain.includes("localhost") ? domain : undefined;

  res.cookies.set({
    name: "session",
    value: token,
    httpOnly: true,
    sameSite: "none",
    secure: true, // Required for SameSite=None
    path: "/",
    domain: cookieDomain,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return token;
}

