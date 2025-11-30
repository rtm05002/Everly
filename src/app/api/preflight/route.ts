export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { serverEnv } from "@/lib/env.server"

export async function GET() {
  try {
    const missing: string[] = []

    // Check required keys based on what the app actually uses
    const requiredKeys = [
      "SUPABASE_URL",
      "SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE",
      "JWT_SIGNING_SECRET",
      "OPENAI_API_KEY",
    ] as const

    for (const key of requiredKeys) {
      const value = process.env[key]
      if (!value || value.trim() === "") {
        missing.push(key)
      }
    }

    const ok = missing.length === 0

    return NextResponse.json({ ok, missing })
  } catch (err) {
    // Never crash - return safe response
    return NextResponse.json({ ok: false, missing: [] })
  }
}


