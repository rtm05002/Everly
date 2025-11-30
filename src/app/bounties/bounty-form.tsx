"use client"

import { useState } from "react"
import { Plus, DollarSign, Star, Award } from "lucide-react"
import { createBountyAction } from "./actions"
import { RewardType, BadgeReward } from "@/lib/types"

const predefinedBadges: BadgeReward[] = [
  { name: "Community Helper", icon: "🤝" },
  { name: "Content Creator", icon: "✍️" },
  { name: "Design Master", icon: "🎨" },
  { name: "Code Wizard", icon: "💻" },
  { name: "Mentor", icon: "👨‍🏫" },
  { name: "Innovator", icon: "💡" },
  { name: "Collaborator", icon: "🤝" },
  { name: "Problem Solver", icon: "🔧" },
  { name: "Early Adopter", icon: "🚀" },
  { name: "Quality Champion", icon: "⭐" },
  { name: "Community Builder", icon: "🏗️" },
  { name: "Knowledge Keeper", icon: "📚" },
]

export function BountyForm() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [rewardType, setRewardType] = useState<RewardType>("usd")
  const [selectedBadge, setSelectedBadge] = useState<BadgeReward | null>(null)

  const handleSubmit = async (formData: FormData) => {
    if (isSubmitting) return // Prevent multiple submissions
    
    setIsSubmitting(true)
    try {
      // Add badge data to form data if badge is selected
      if (rewardType === "badge" && selectedBadge) {
        formData.set("badgeName", selectedBadge.name)
        formData.set("badgeIcon", selectedBadge.icon)
        formData.set("badgeDescription", selectedBadge.description || "")
      }
      
      const result = await createBountyAction(formData)
      if (result?.ok) {
        handleClose()
      } else {
        alert(result?.error || 'Failed to create bounty. Please try again.')
      }
    } catch (error) {
      console.error('Failed to create bounty:', error)
      alert('Failed to create bounty. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setRewardType("usd")
    setSelectedBadge(null)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Create Bounty
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-semibold mb-4">Create New Bounty</h2>
        
        <form action={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-foreground mb-2">
              Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter bounty title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Reward Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRewardType("usd")}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                  rewardType === "usd"
                    ? "bg-blue-100 text-blue-700 border-blue-300"
                    : "bg-background text-foreground border-border hover:bg-accent"
                }`}
              >
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">USD</span>
              </button>
              <button
                type="button"
                onClick={() => setRewardType("points")}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                  rewardType === "points"
                    ? "bg-blue-100 text-blue-700 border-blue-300"
                    : "bg-background text-foreground border-border hover:bg-accent"
                }`}
              >
                <Star className="h-4 w-4" />
                <span className="text-sm">Points</span>
              </button>
              <button
                type="button"
                onClick={() => setRewardType("badge")}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                  rewardType === "badge"
                    ? "bg-blue-100 text-blue-700 border-blue-300"
                    : "bg-background text-foreground border-border hover:bg-accent"
                }`}
              >
                <Award className="h-4 w-4" />
                <span className="text-sm">Badge</span>
              </button>
            </div>
          </div>

          {/* Reward Amount Fields */}
          {rewardType === "usd" && (
            <div>
              <label htmlFor="rewardUsd" className="block text-sm font-medium text-foreground mb-2">
                Reward Amount (USD)
              </label>
              <input
                id="rewardUsd"
                name="rewardUsd"
                type="number"
                min="0"
                step="0.01"
                required
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="0.00"
              />
            </div>
          )}

          {rewardType === "points" && (
            <div>
              <label htmlFor="rewardPoints" className="block text-sm font-medium text-foreground mb-2">
                Points
              </label>
              <input
                id="rewardPoints"
                name="rewardPoints"
                type="number"
                min="1"
                required
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="100"
              />
            </div>
          )}

          {rewardType === "badge" && (
            <div className="space-y-3">
              {!selectedBadge ? (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Choose Badge
                  </label>
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                    {predefinedBadges.map((badge) => (
                      <button
                        key={badge.name}
                        type="button"
                        onClick={() => setSelectedBadge(badge)}
                        className="flex items-center gap-2 p-2 rounded-lg border transition-colors text-left hover:bg-accent"
                      >
                        <span className="text-lg">{badge.icon}</span>
                        <span className="text-sm font-medium truncate">{badge.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-foreground">Selected Badge</label>
                    <button
                      type="button"
                      onClick={() => setSelectedBadge(null)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Change
                    </button>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-2xl">{selectedBadge.icon}</span>
                    <div>
                      <div className="font-medium text-blue-900">{selectedBadge.name}</div>
                      <div className="text-xs text-blue-600">Predefined badge</div>
                    </div>
                  </div>
                </div>
              )}
              
              {selectedBadge && (
                <div className="space-y-3">
                  <div className="text-center text-sm text-muted-foreground">
                    Or customize below
                  </div>
                  
                  <div>
                    <label htmlFor="badgeName" className="block text-sm font-medium text-foreground mb-2">
                      Badge Name
                    </label>
                    <input
                      id="badgeName"
                      name="badgeName"
                      type="text"
                      value={selectedBadge.name}
                      onChange={(e) => setSelectedBadge({ ...selectedBadge, name: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g., Community Helper"
                    />
                  </div>
                  <div>
                    <label htmlFor="badgeIcon" className="block text-sm font-medium text-foreground mb-2">
                      Badge Icon (emoji)
                    </label>
                    <input
                      id="badgeIcon"
                      name="badgeIcon"
                      type="text"
                      value={selectedBadge.icon}
                      onChange={(e) => setSelectedBadge({ ...selectedBadge, icon: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="🏆"
                      maxLength={2}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hidden field to pass reward type */}
          <input type="hidden" name="rewardType" value={rewardType} />

          <div>
            <label htmlFor="deadline" className="block text-sm font-medium text-foreground mb-2">
              Deadline (optional)
            </label>
            <input
              id="deadline"
              name="deadline"
              type="date"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-muted-foreground border border-border rounded-lg hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create Bounty"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
