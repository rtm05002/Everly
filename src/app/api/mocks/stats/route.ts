import { NextResponse } from "next/server"

const mockStats = {
  members: {
    total: 12483,
    active: 8291,
    new: 234,
    growth: {
      value: 12.5,
      direction: "up",
      percentage: 12.5,
      period: "last 7 days"
    }
  },
  bounties: {
    total: 234,
    active: 18,
    completed: 216,
    totalRewards: 12400,
    growth: {
      value: 8.2,
      direction: "up",
      percentage: 8.2,
      period: "last 7 days"
    }
  },
  messages: {
    total: 45231,
    today: 1247,
    thisWeek: 8934,
    growth: {
      value: -3.1,
      direction: "down",
      percentage: 3.1,
      period: "last 7 days"
    }
  },
  engagement: {
    score: 87.3,
    trend: {
      value: 18.7,
      direction: "up",
      percentage: 18.7,
      period: "last 7 days"
    }
  }
}

export async function GET() {
  return NextResponse.json({
    data: mockStats,
    success: true,
    message: "Stats retrieved successfully"
  })
}

