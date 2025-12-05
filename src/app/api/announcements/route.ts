import { NextRequest, NextResponse } from "next/server"
import { read, write } from "@/server/store"
import { Event } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    const { title, body, audience } = await request.json()

    if (!title || !body || !audience) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Load existing announcements
    const announcements = await read<any[]>('announcements') || []
    
    // Create new announcement
    const newAnnouncement = {
      id: (announcements.length + 1).toString(),
      title,
      body,
      audience,
      createdAt: new Date().toISOString(),
      sent: true
    }

    // Save announcement
    await write('announcements', [...announcements, newAnnouncement])

    // Load members to determine who gets the announcement
    const members = await read<any[]>('members') || []
    
    // Filter members based on audience
    let targetMembers = members
    if (audience === 'inactive') {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      targetMembers = members.filter(member => 
        new Date(member.lastActiveAt) < sevenDaysAgo
      )
    } else if (audience === 'new') {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      targetMembers = members.filter(member => 
        new Date(member.joinedAt) > sevenDaysAgo
      )
    }

    // Create synthetic events for each targeted member
    const events = await read<Event[]>('events') || []
    const newEvents = targetMembers.map(member => ({
      type: "announcement_received" as const,
      memberId: member.id,
      ts: new Date().toISOString(),
      metadata: { 
        announcementId: newAnnouncement.id,
        title,
        audience 
      }
    }))

    // Save updated events
    await write('events', [...events, ...newEvents])

    return NextResponse.json({ 
      success: true, 
      announcement: newAnnouncement,
      recipients: targetMembers.length 
    })

  } catch (error) {
    console.error('Error creating announcement:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}











