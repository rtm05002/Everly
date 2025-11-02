import { NextRequest, NextResponse } from "next/server"
import { verifyJWT } from "@/lib/jwt"

export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: "Debug endpoints are only available in development" },
      { status: 403 }
    )
  }

  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header. Use: Authorization: Bearer <token>" },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    const secret = process.env.SUPABASE_JWT_SECRET

    if (!secret) {
      return NextResponse.json(
        { error: "JWT secret not configured" },
        { status: 500 }
      )
    }

    const claims = verifyJWT(token, secret)
    if (!claims) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      claims,
      debug: {
        tokenLength: token.length,
        hasSecret: !!secret,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error("Error verifying token:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


