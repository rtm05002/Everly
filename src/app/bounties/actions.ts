"use server"

import { revalidatePath } from "next/cache"
import { adapter } from "@/server/data-adapter"
import { BountyReward, RewardType } from "@/lib/types"

export async function createBountyAction(formData: FormData) {
  try {
    const title = String(formData.get("title") ?? "").trim()
    const rewardType = String(formData.get("rewardType") ?? "usd") as RewardType
    const deadline = String(formData.get("deadline") || "") || null
    
    if (!title) {
      return { ok: false, error: "Title is required" }
    }

    let reward: BountyReward

    switch (rewardType) {
      case "usd":
        const rewardUsd = Number(formData.get("rewardUsd") ?? 0)
        reward = {
          type: "usd",
          amount: Math.round(rewardUsd * 100), // Convert to cents
        }
        break
      case "points":
        const rewardPoints = Number(formData.get("rewardPoints") ?? 0)
        reward = {
          type: "points",
          amount: rewardPoints,
        }
        break
      case "badge":
        const badgeName = String(formData.get("badgeName") ?? "").trim()
        const badgeIcon = String(formData.get("badgeIcon") ?? "").trim()
        const badgeDescription = String(formData.get("badgeDescription") ?? "").trim()
        
        if (!badgeName || !badgeIcon) {
          return { ok: false, error: "Badge name and icon are required" }
        }
        
        reward = {
          type: "badge",
          badge: {
            name: badgeName,
            icon: badgeIcon,
            description: badgeDescription || undefined,
          },
        }
        break
      default:
        return { ok: false, error: "Invalid reward type" }
    }

    await adapter.createBounty({
      title,
      reward,
      deadline,
    })

    revalidatePath("/bounties")
    return { ok: true }
  } catch (error: any) {
    // Log detailed error in development only
    if (process.env.NODE_ENV !== "production") {
      console.error("[createBountyAction] Error:", error)
    }
    
    // Return user-friendly error message
    return { 
      ok: false, 
      error: "Unable to save bounty. Please check your configuration and try again." 
    }
  }
}

export async function completeBountyAction(id: string, memberId?: string) {
  try {
    await adapter.updateBounty(id, { status: "completed" }, memberId)
    revalidatePath("/bounties")
    return { ok: true }
  } catch (error: any) {
    // Log detailed error in development only
    if (process.env.NODE_ENV !== "production") {
      console.error("[completeBountyAction] Error:", error)
    }
    
    // Return user-friendly error message
    return { 
      ok: false, 
      error: "Unable to complete bounty. Please try again." 
    }
  }
}

export async function deleteBountyAction(id: string) {
  try {
    await adapter.deleteBounty(id)
    revalidatePath("/bounties")
    return { ok: true }
  } catch (error: any) {
    // Log detailed error in development only
    if (process.env.NODE_ENV !== "production") {
      console.error("[deleteBountyAction] Error:", error)
    }
    
    // Return user-friendly error message
    return { 
      ok: false, 
      error: "Unable to delete bounty. Please try again." 
    }
  }
}