export const runtime = "nodejs"
import { NextRequest, NextResponse } from "next/server";
import { signJwt } from "@/lib/jwt";
import { verifyToken } from "@/lib/auth/session";
import { DEMO_MODE, DEMO_HUB_ID } from "@/lib/env.server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hubId: bodyHubId, memberId } = body;

    // In demo mode, always use DEMO_HUB_ID (ignore body)
    const hubId = DEMO_MODE && DEMO_HUB_ID ? DEMO_HUB_ID : bodyHubId;

    if (!hubId || !memberId) {
      return NextResponse.json(
        { error: "Missing required fields: hubId and memberId" },
        { status: 400 }
      );
    }

    console.log('[Widget Session] Creating token for hub:', hubId, 'member:', memberId);

    const token = signJwt({
      hub_id: hubId,
      member_id: memberId,
      role: "member",
    });

    console.log('[Widget Session] Token created successfully, length:', token.length);

    return NextResponse.json({ token, memberId });
  } catch (error) {
    console.error("Error creating session token:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: message === "JWT secret not configured" ? 500 : 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const claims = verifyToken(token);

    if (!claims) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    return NextResponse.json({ claims });
  } catch (error) {
    console.error("Error verifying token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

