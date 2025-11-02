export const runtime = "nodejs"
import { NextRequest, NextResponse } from "next/server";
import { signJWT, verifyJWT } from "@/lib/jwt";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hubId, memberId } = body;

    // Validate required fields
    if (!hubId || !memberId) {
      return NextResponse.json(
        { error: "Missing required fields: hubId and memberId" },
        { status: 400 }
      );
    }

    // Get JWT secret from environment
    const secret = process.env.SUPABASE_JWT_SECRET;
    console.log('[Widget Session] SUPABASE_JWT_SECRET configured:', !!secret);
    if (!secret) {
      console.error('[Widget Session] JWT secret not configured - SUPABASE_JWT_SECRET is missing');
      return NextResponse.json(
        { error: "JWT secret not configured" },
        { status: 500 }
      );
    }
    
    console.log('[Widget Session] Creating token for hub:', hubId, 'member:', memberId);

    // Create JWT token with 10-minute expiry
    const token = signJWT(
      {
        aud: "authenticated",
        iss: "everly",
        sub: memberId,
        role: "member",
        hub_id: hubId,
        member_id: memberId
      },
      secret,
      10 // 10 minutes
    );
    
    console.log('[Widget Session] Token created successfully, length:', token.length);

    return NextResponse.json({ token, memberId });
  } catch (error) {
    console.error("Error creating session token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const secret = process.env.SUPABASE_JWT_SECRET;
    
    if (!secret) {
      return NextResponse.json(
        { error: "JWT secret not configured" },
        { status: 500 }
      );
    }

    const claims = verifyJWT(token, secret);
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

