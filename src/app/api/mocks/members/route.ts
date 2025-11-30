import { NextResponse } from "next/server"

const mockMembers = [
  {
    id: "1",
    username: "Sarah Chen",
    email: "sarah@example.com",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    joinedAt: "2024-01-15T10:30:00Z",
    lastActiveAt: "2024-01-20T14:22:00Z",
    status: "active",
    role: "member",
    totalBounties: 5,
    totalRewards: 250,
    engagementScore: 87
  },
  {
    id: "2",
    username: "Alex Rivera",
    email: "alex@example.com",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    joinedAt: "2024-01-10T09:15:00Z",
    lastActiveAt: "2024-01-20T16:45:00Z",
    status: "active",
    role: "moderator",
    totalBounties: 12,
    totalRewards: 680,
    engagementScore: 94
  },
  {
    id: "3",
    username: "Jordan Lee",
    email: "jordan@example.com",
    joinedAt: "2024-01-18T11:20:00Z",
    lastActiveAt: "2024-01-19T08:30:00Z",
    status: "active",
    role: "member",
    totalBounties: 2,
    totalRewards: 120,
    engagementScore: 72
  },
  {
    id: "4",
    username: "Morgan Blake",
    email: "morgan@example.com",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    joinedAt: "2024-01-05T14:45:00Z",
    lastActiveAt: "2024-01-20T12:15:00Z",
    status: "active",
    role: "member",
    totalBounties: 8,
    totalRewards: 420,
    engagementScore: 89
  },
  {
    id: "5",
    username: "Taylor Swift",
    email: "taylor@example.com",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    joinedAt: "2024-01-12T16:30:00Z",
    lastActiveAt: "2024-01-20T10:20:00Z",
    status: "active",
    role: "admin",
    totalBounties: 15,
    totalRewards: 950,
    engagementScore: 96
  }
]

export async function GET() {
  return NextResponse.json({
    data: mockMembers,
    success: true,
    message: "Members retrieved successfully"
  })
}

export async function POST(request: Request) {
  const body = await request.json()
  
  const newMember = {
    id: (mockMembers.length + 1).toString(),
    username: body.username || "New Member",
    email: body.email || "new@example.com",
    avatar: body.avatar,
    joinedAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    status: "active",
    role: "member",
    totalBounties: 0,
    totalRewards: 0,
    engagementScore: 0
  }
  
  mockMembers.push(newMember)
  
  return NextResponse.json({
    data: newMember,
    success: true,
    message: "Member created successfully"
  }, { status: 201 })
}







