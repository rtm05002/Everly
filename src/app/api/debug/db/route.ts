import { NextRequest, NextResponse } from "next/server"
import { createMemberClient } from "@/lib/supabase-browser"

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

    // Check if required environment variables are set
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: "Supabase environment variables not configured" },
        { status: 500 }
      )
    }

    // Create Supabase client with member token
    const supabase = createMemberClient(token)

    // Run a trivial query to test connectivity and RLS
    const { data, error } = await supabase
      .from("hubs")
      .select("id")
      .limit(1)

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        debug: {
          hasToken: !!token,
          tokenLength: token.length,
          supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          timestamp: new Date().toISOString()
        }
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      ok: true,
      data,
      debug: {
        hasToken: !!token,
        tokenLength: token.length,
        supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error("Error testing database connectivity:", error)
    return NextResponse.json({
      success: false,
      error: "Database connectivity test failed",
      details: error instanceof Error ? error.message : "Unknown error",
      debug: {
        timestamp: new Date().toISOString()
      }
    }, { status: 500 })
  }
}


