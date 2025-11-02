import { AIConfig } from "@/lib/ai-types"
import { Event, Member } from "@/lib/types"

export interface Nudge {
  memberId: string
  message: string
  reason: string
}

/**
 * Evaluates nudges based on AI configuration, events, and member data
 * Returns array of nudges to send to members
 */
export function evaluateNudges(
  cfg: AIConfig,
  events: Event[],
  members: Member[]
): Nudge[] {
  const nudges: Nudge[] = []
  const now = new Date()

  for (const member of members) {
    // Find relevant nudge recipes
    const inactiveRecipe = cfg.nudgeRecipes.find(r => r.trigger === "member_inactive_7_days")
    const newMemberRecipe = cfg.nudgeRecipes.find(r => r.trigger === "new_member_0_posts_3_days")
    const streakRecipe = cfg.nudgeRecipes.find(r => r.trigger === "streak_milestone")

    // Check for inactive member (7+ days since last active)
    const lastActiveDate = new Date(member.lastActiveAt)
    const daysSinceActive = Math.floor((now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysSinceActive >= 7 && inactiveRecipe) {
      nudges.push({
        memberId: member.id,
        message: inactiveRecipe.messageTemplate,
        reason: `Member inactive for ${daysSinceActive} days`
      })
    }

    // Check for new member with no posts after 3 days
    const joinedDate = new Date(member.joinedAt)
    const daysSinceJoined = Math.floor((now.getTime() - joinedDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysSinceJoined >= 3 && member.messagesCount === 0 && newMemberRecipe) {
      nudges.push({
        memberId: member.id,
        message: newMemberRecipe.messageTemplate,
        reason: `New member with no posts after ${daysSinceJoined} days`
      })
    }

    // Check for streak milestones (7 or 30 days)
    const streakEvents = events.filter(e => 
      e.memberId === member.id && 
      e.type === "streak_milestone" &&
      (e.metadata?.days === 7 || e.metadata?.days === 30)
    )
    
    if (streakEvents.length > 0 && streakRecipe) {
      const latestStreak = streakEvents[streakEvents.length - 1]
      nudges.push({
        memberId: member.id,
        message: streakRecipe.messageTemplate.replace("{days}", latestStreak.metadata?.days?.toString() || ""),
        reason: `Streak milestone: ${latestStreak.metadata?.days} days`
      })
    }
  }

  return nudges
}
