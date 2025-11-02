export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { read, write } from "@/server/store"

interface QueryRequest {
  question: string
  memberId?: string
}

interface AIResponse {
  answer: string
  confidence: number
}

// Canned answers based on keywords
const cannedAnswers: Record<string, AIResponse> = {
  bounty: {
    answer: "To claim a bounty, go to the Challenges tab and click the 'Claim Bounty' button on any active challenge. Once claimed, you'll be able to complete the requirements and earn rewards!",
    confidence: 0.95
  },
  points: {
    answer: "You earn points by completing bounties, helping other members, and participating in community activities. Check your progress on the Home tab to see your current points and engagement level.",
    confidence: 0.90
  },
  help: {
    answer: "I'm here to help! You can ask me about bounties, points, community features, or how to get started. What specific question do you have?",
    confidence: 0.85
  },
  challenge: {
    answer: "Challenges are special tasks you can complete to earn rewards and points. Active challenges are shown in the Challenges tab. Click 'Claim Bounty' to get started on any challenge!",
    confidence: 0.90
  },
  reward: {
    answer: "Rewards are earned by completing bounties and challenges. Each bounty shows the reward amount in dollars. Complete the requirements to claim your reward!",
    confidence: 0.85
  },
  community: {
    answer: "Welcome to the community! You can participate by completing challenges, helping other members, and engaging with community activities. Start by checking out the Home tab to see your progress.",
    confidence: 0.80
  },
  default: {
    answer: "I understand you're looking for help. While I'm still learning, I can help with questions about bounties, points, challenges, and community features. Could you be more specific about what you need help with?",
    confidence: 0.60
  }
}

function getAnswerForQuestion(question: string): AIResponse {
  const lowerQuestion = question.toLowerCase()
  
  // Check for keywords in order of specificity
  if (lowerQuestion.includes('claim') && lowerQuestion.includes('bounty')) {
    return cannedAnswers.bounty
  }
  if (lowerQuestion.includes('bounty')) {
    return cannedAnswers.bounty
  }
  if (lowerQuestion.includes('points')) {
    return cannedAnswers.points
  }
  if (lowerQuestion.includes('challenge')) {
    return cannedAnswers.challenge
  }
  if (lowerQuestion.includes('reward')) {
    return cannedAnswers.reward
  }
  if (lowerQuestion.includes('community')) {
    return cannedAnswers.community
  }
  if (lowerQuestion.includes('help')) {
    return cannedAnswers.help
  }
  
  return cannedAnswers.default
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ hubId: string }> }
) {
  const startTime = Date.now()
  
  try {
    const body: QueryRequest = await request.json()
    const { question, memberId } = body
    const { hubId } = await params

    // Validate required fields
    if (!question?.trim()) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      )
    }

    // Load AI config from store
    const aiConfig = await read<any>('aiConfig')
    
    // Get canned answer based on question
    const response = getAnswerForQuestion(question)
    
    // Calculate latency
    const latencyMs = Date.now() - startTime
    
    // Log the interaction
    const aiLogs = await read<any[]>('ai_logs') || []
    const logEntry = {
      ts: new Date().toISOString(),
      hubId,
      memberId: memberId || 'anonymous',
      question: question.trim(),
      answer: response.answer,
      confidence: response.confidence,
      latencyMs,
      resolved: true,
      config: aiConfig ? { mode: aiConfig.mode, tone: aiConfig.tone } : null
    }
    
    await write('ai_logs', [...aiLogs, logEntry])
    
    return NextResponse.json({
      answer: response.answer,
      confidence: response.confidence,
      latencyMs
    })
    
  } catch (error) {
    console.error("Error processing AI query:", error)
    
    // Log error
    const { hubId: errorHubId } = await params
    const aiLogs = await read<any[]>('ai_logs') || []
    const errorLogEntry = {
      ts: new Date().toISOString(),
      hubId: errorHubId,
      memberId: 'anonymous',
      question: 'Error occurred',
      answer: 'Sorry, I encountered an error processing your question.',
      confidence: 0,
      latencyMs: Date.now() - startTime,
      resolved: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
    
    await write('ai_logs', [...aiLogs, errorLogEntry])
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

