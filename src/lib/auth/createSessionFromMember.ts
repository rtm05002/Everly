import { NextResponse } from "next/server";
import { signJwt } from "@/lib/jwt";

/**
 * Creates a session JWT and sets it as a cookie on the provided NextResponse.
 * Used in route handlers to authenticate users after OAuth or dev bypass.
 */
export function createSessionForMember(
  res: NextResponse,
  hubId: string,
  memberId: string,
  role: "creator" | "moderator" | "member"
): string {
  const token = signJwt({ hub_id: hubId, member_id: memberId, role });

  res.cookies.set({
    name: "session",
    value: token,
    httpOnly: true,
    sameSite: "none",
    secure: true, // Required for SameSite=None
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return token;
}

