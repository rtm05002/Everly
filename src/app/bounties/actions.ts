"use server"

import { revalidatePath } from "next/cache"
import { adapter } from "@/server/data-adapter"
import { BountyReward, RewardType } from "@/lib/types"

export async function createBountyAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim()
  const rewardType = String(formData.get("rewardType") ?? "usd") as RewardType
  const deadline = String(formData.get("deadline") || "") || null
  
  if (!title) throw new Error("Title required")

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
      
      if (!badgeName || !badgeIcon) throw new Error("Badge name and icon required")
      
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
      throw new Error("Invalid reward type")
  }

  await adapter.createBounty({
    title,
    reward,
    deadline,
  })

  revalidatePath("/bounties")
}

export async function completeBountyAction(id: string, memberId?: string) {
  await adapter.updateBounty(id, { status: "completed" }, memberId)
  revalidatePath("/bounties")
}

export async function deleteBountyAction(id: string) {
  await adapter.deleteBounty(id)
  revalidatePath("/bounties")
}