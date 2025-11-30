"use client"

import { useEffect, useState } from "react"
import { OnboardingChecklist } from "./onboarding-checklist"

interface WidgetHomeProps {
  hubId: string
}

interface MemberStats {
  postsCount: number
  challengesWon: number
  engagementPercent: number
}

export function WidgetHome({ hubId }: WidgetHomeProps) {
  const [stats, setStats] = useState<MemberStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [memberId, setMemberId] = useState<string | null>(null)

  useEffect(() => {
    // Get member ID from session token
    const initSession = async () => {
      try {
        const sessionResponse = await fetch('/api/widget/session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            hubId,
            memberId: '00000000-0000-0000-0000-000000000001' // Demo member UUID
          })
        })

        if (sessionResponse.ok) {
          const { token, memberId: mid } = await sessionResponse.json()
          if (mid) {
            setMemberId(mid)
            // Fetch stats
            const statsRes = await fetch(`/api/hub/${hubId}/members/${mid}/stats`)
            if (statsRes.ok) {
              const statsData = await statsRes.json()
              setStats(statsData)
            }
          }
        }
      } catch (error) {
        console.error('Error loading member stats:', error)
      } finally {
        setLoading(false)
      }
    }

    initSession()
  }, [hubId])

  const engagementPercent = stats?.engagementPercent || 0
  const postsCount = stats?.postsCount || 0
  const challengesWon = stats?.challengesWon || 0

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Welcome to the Community!
        </h2>
        <p className="text-muted-foreground">
          You're part of hub <span className="font-medium text-foreground">{hubId}</span>
        </p>
      </div>

      {/* Onboarding Checklist */}
      <OnboardingChecklist hubId={hubId} />

      {/* Progress Section */}
      <div className="bg-primary/5 rounded-xl p-6 border border-primary/20">
        <h3 className="text-lg font-medium text-foreground mb-4">
          Your Progress
        </h3>
        
        {loading ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Community Engagement</span>
              <span className="text-sm font-medium text-foreground animate-pulse">...</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2 animate-pulse" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Community Engagement</span>
              <span className="text-sm font-medium text-foreground">{engagementPercent}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${engagementPercent}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 text-center">
          <div className="bg-background rounded-lg p-4 border border-border">
            {loading ? (
              <div className="text-2xl font-bold text-primary animate-pulse">...</div>
            ) : (
              <div className="text-2xl font-bold text-primary">{postsCount}</div>
            )}
            <div className="text-xs text-muted-foreground">Posts Made</div>
          </div>
          <div className="bg-background rounded-lg p-4 border border-border">
            {loading ? (
              <div className="text-2xl font-bold text-primary animate-pulse">...</div>
            ) : (
              <div className="text-2xl font-bold text-primary">{challengesWon}</div>
            )}
            <div className="text-xs text-muted-foreground">Challenges Won</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button className="bg-primary text-primary-foreground rounded-lg p-4 text-left hover:bg-primary/90 transition-colors">
          <div className="font-medium">Start a Challenge</div>
          <div className="text-sm opacity-90">Join an active challenge</div>
        </button>
        <button className="bg-secondary text-secondary-foreground rounded-lg p-4 text-left hover:bg-secondary/80 transition-colors">
          <div className="font-medium">View Leaderboard</div>
          <div className="text-sm opacity-90">See how you rank</div>
        </button>
      </div>
    </div>
  )
}

