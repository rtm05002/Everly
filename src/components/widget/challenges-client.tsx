"use client"

import { useState, useEffect } from "react"
import { claimBountyAction } from "@/app/widget/actions"
import { Empty } from "@/components/ui/empty"
import { Trophy } from "lucide-react"
import { createMemberClient } from "@/lib/supabase-browser"
import { toast } from "sonner"
import type { Bounty } from "@/lib/types"

interface ChallengesClientProps {
  bounties: Bounty[]
  hubId: string
}

export function ChallengesClient({ bounties: initialBounties, hubId }: ChallengesClientProps) {
  // Use the bounties passed from the server - they're already filtered by hub and include all needed data
  const [bounties, setBounties] = useState<Bounty[]>(initialBounties)
  const [claimedBounties, setClaimedBounties] = useState<Set<string>>(new Set())
  const [isClaiming, setIsClaiming] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [sessionToken, setSessionToken] = useState<string | null>(null)

  useEffect(() => {
    // Initialize session token for claiming bounties
    const initSession = async () => {
      try {
        console.log('[Widget] Initializing session for hub:', hubId)
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

        console.log('[Widget] Session response status:', sessionResponse.status)
        if (sessionResponse.ok) {
          const data = await sessionResponse.json()
          console.log('[Widget] Session data:', data)
          setSessionToken(data.token || data)
        } else {
          const errorText = await sessionResponse.text()
          console.error('[Widget] Session error:', sessionResponse.status, errorText)
          // Don't block the UI - just show an info toast if there's an issue
          if (sessionResponse.status === 500) {
            console.warn('[Widget] JWT secret may not be configured. Widget will work in read-only mode.')
          }
        }
      } catch (error) {
        console.error('[Widget] Error getting session token:', error)
        // Non-blocking - can still view bounties without claiming
      }
    }

    initSession()
  }, [hubId])

  const handleClaimBounty = async (bountyId: string) => {
    if (!sessionToken) {
      toast.error("No session token available")
      return
    }

    setIsClaiming(prev => new Set(prev).add(bountyId))
    
    try {
      const result = await claimBountyAction(bountyId, sessionToken)
      
      if (result.ok) {
        setClaimedBounties(prev => new Set(prev).add(bountyId))
        toast.success("Bounty claimed successfully!")
      }
    } catch (error) {
      console.error("Error claiming bounty:", error)
      toast.error("Failed to claim bounty")
    } finally {
      setIsClaiming(prev => {
        const newSet = new Set(prev)
        newSet.delete(bountyId)
        return newSet
      })
    }
  }

  // Filter to only show active bounties
  const activeBounties = bounties.filter(bounty => bounty.status === "active")

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Available Challenges
          </h2>
          <p className="text-muted-foreground">
            Loading challenges for hub {hubId}...
          </p>
        </div>
        <div className="grid gap-4">
          <div className="rounded-xl border p-6 bg-primary/5 border-primary/20 animate-pulse">
            <div className="h-4 bg-primary/20 rounded mb-2"></div>
            <div className="h-3 bg-primary/10 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Available Challenges
        </h2>
        <p className="text-muted-foreground">
          Complete challenges to earn points and level up in hub {hubId}
        </p>
      </div>

      <div className="grid gap-4">
        {activeBounties.map((bounty) => {
          const isClaimed = claimedBounties.has(bounty.id)
          const isClaimingBounty = isClaiming.has(bounty.id)
          
          return (
            <div
              key={bounty.id}
              className={`rounded-xl border p-6 transition-all duration-200 ${
                isClaimed
                  ? "bg-success/5 border-success/20"
                  : "bg-primary/5 border-primary/20 hover:bg-primary/10"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">
                    {bounty.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Complete this bounty to earn rewards
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-primary">
                    {bounty.reward.type === "usd" 
                      ? `$${((bounty.reward.amount || 0) / 100).toFixed(2)}`
                      : bounty.reward.type === "points"
                      ? `${bounty.reward.amount || 0} points`
                      : bounty.reward.type === "badge"
                      ? `${bounty.reward.badge?.icon || "🏆"} ${bounty.reward.badge?.name || "Badge"}`
                      : "Reward"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {bounty.participants} participants
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  isClaimed
                    ? "bg-success/10 text-success"
                    : "bg-primary/10 text-primary"
                }`}>
                  {isClaimed ? "✓ Claimed" : "● Active"}
                </span>

                <button 
                  onClick={() => handleClaimBounty(bounty.id)}
                  disabled={isClaimed || isClaimingBounty || !sessionToken}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isClaimed
                      ? "bg-success/10 text-success cursor-default"
                      : isClaimingBounty
                      ? "bg-primary/50 text-primary-foreground cursor-not-allowed"
                      : !sessionToken
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  {isClaimingBounty ? "Claiming..." : isClaimed ? "Claimed" : !sessionToken ? "Loading..." : "Claim Bounty"}
                </button>
              </div>
            </div>
          )
        })}
        
        {activeBounties.length === 0 && (
          <Empty
            icon={Trophy}
            title="No active challenges"
            description="There are no active challenges available right now. Check back later for new opportunities to earn rewards in this hub."
          />
        )}
      </div>
    </div>
  )
}
