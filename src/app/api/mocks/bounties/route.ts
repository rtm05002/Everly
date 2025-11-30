import { NextResponse } from "next/server"

const mockBounties = [
  {
    id: "1",
    title: "Create a welcome video",
    description: "Create an engaging welcome video for new community members that explains our mission and values.",
    reward: 50,
    currency: "USD",
    status: "active",
    createdBy: "5",
    participants: ["1", "2", "3"],
    deadline: "2024-01-25T23:59:59Z",
    createdAt: "2024-01-18T10:30:00Z",
    tags: ["video", "welcome", "onboarding"],
    difficulty: "medium"
  },
  {
    id: "2",
    title: "Write a community guide",
    description: "Create a comprehensive guide that helps new members understand community guidelines and best practices.",
    reward: 100,
    currency: "USD",
    status: "active",
    createdBy: "5",
    participants: ["1", "4"],
    deadline: "2024-01-28T23:59:59Z",
    createdAt: "2024-01-17T14:20:00Z",
    tags: ["documentation", "guide", "onboarding"],
    difficulty: "hard"
  },
  {
    id: "3",
    title: "Design social media templates",
    description: "Create a set of social media templates for community announcements and events.",
    reward: 75,
    currency: "USD",
    status: "completed",
    createdBy: "5",
    assignedTo: "4",
    participants: ["4", "2", "1"],
    deadline: "2024-01-20T23:59:59Z",
    createdAt: "2024-01-15T09:15:00Z",
    completedAt: "2024-01-19T16:30:00Z",
    tags: ["design", "social-media", "templates"],
    difficulty: "easy"
  },
  {
    id: "4",
    title: "Organize community event",
    description: "Plan and organize a virtual meetup for community members to network and share ideas.",
    reward: 150,
    currency: "USD",
    status: "active",
    createdBy: "5",
    participants: ["2", "3", "4"],
    deadline: "2024-02-01T23:59:59Z",
    createdAt: "2024-01-16T11:45:00Z",
    tags: ["event", "networking", "community"],
    difficulty: "hard"
  },
  {
    id: "5",
    title: "Create tutorial series",
    description: "Develop a series of tutorials covering our platform's key features and advanced usage.",
    reward: 200,
    currency: "USD",
    status: "active",
    createdBy: "5",
    participants: ["1", "2"],
    deadline: "2024-02-05T23:59:59Z",
    createdAt: "2024-01-14T13:20:00Z",
    tags: ["tutorial", "education", "content"],
    difficulty: "hard"
  }
]

export async function GET() {
  return NextResponse.json({
    data: mockBounties,
    success: true,
    message: "Bounties retrieved successfully"
  })
}

export async function POST(request: Request) {
  const body = await request.json()
  
  const newBounty = {
    id: (mockBounties.length + 1).toString(),
    title: body.title || "New Bounty",
    description: body.description || "Description for new bounty",
    reward: body.reward || 50,
    currency: body.currency || "USD",
    status: "active",
    createdBy: body.createdBy || "5",
    participants: [],
    deadline: body.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    tags: body.tags || [],
    difficulty: body.difficulty || "medium"
  }
  
  mockBounties.push(newBounty)
  
  return NextResponse.json({
    data: newBounty,
    success: true,
    message: "Bounty created successfully"
  }, { status: 201 })
}







