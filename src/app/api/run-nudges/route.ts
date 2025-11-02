import { NextRequest, NextResponse } from "next/server"
import { read, write } from "@/server/store"
import { evaluateNudges } from "@/lib/nudges"
import { AIConfig } from "@/lib/ai-types"

export async function POST(request: NextRequest) {
  try {
    // Load AI configuration
    const aiConfig = await read<AIConfig>('aiConfig')
    if (!aiConfig) {
      return NextResponse.json({ error: "AI configuration not found" }, { status: 404 })
    }

    // Load members and events
    const [members, events] = await Promise.all([
      read<any[]>('members') || [],
      read<any[]>('events') || []
    ])

    // Evaluate nudges
    const nudges = evaluateNudges(aiConfig, events, members)

    // Load existing nudge log
    const nudgeLog = await read<any[]>('nudgeLog') || []

    // Create new log entry
    const logEntry = {
      ts: new Date().toISOString(),
      count: nudges.length,
      items: nudges.map(nudge => ({
        memberId: nudge.memberId,
        reason: nudge.reason,
        message: nudge.message
      }))
    }

    // Save updated log
    await write('nudgeLog', [...nudgeLog, logEntry])

    return NextResponse.json({ 
      success: true, 
      nudgesSent: nudges.length,
      timestamp: logEntry.ts
    })

  } catch (error) {
    console.error('Error running nudges:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

