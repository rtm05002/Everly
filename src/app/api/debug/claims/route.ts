import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth/session"

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

    const token = authHeader.substring(7)

    const claims = verifyToken(token)
    if (!claims) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 },
      )
    }

    return NextResponse.json({
      success: true,
      claims,
      debug: {
        tokenLength: token.length,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Error verifying token:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}



