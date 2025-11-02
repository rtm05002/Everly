import { DashboardLayout } from "@/components/dashboard-layout"
import { Trophy, Clock, CheckCircle2, DollarSign, Plus, Trash2, Star, Award } from "lucide-react"
import { adapter } from "@/server/data-adapter"
import { revalidatePath } from "next/cache"
import { BountyForm } from "./bounty-form"
import { CompleteBountyButton } from "./complete-bounty-button"
import { DeleteBountyButton } from "./delete-bounty-button"

export default async function BountiesPage() {
  const [bounties, stats] = await Promise.all([
    adapter.listBounties(),
    adapter.getStats("7d")
  ])

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return "No deadline"
    
    const deadlineDate = new Date(deadline)
    const now = new Date()
    const diffTime = deadlineDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return "Expired"
    if (diffDays === 0) return "Due today"
    if (diffDays === 1) return "Due tomorrow"
    return `${diffDays} days left`
  }

  const formatReward = (reward: any) => {
    if (!reward || !reward.type) return "No reward"
    
    switch (reward.type) {
      case "usd":
        return `$${((reward.amount || 0) / 100).toFixed(2)}`
      case "points":
        return `${reward.amount || 0} points`
      case "badge":
        return `${reward.badge?.icon || "🏆"} ${reward.badge?.name || "Badge"}`
      default:
        return "Unknown reward"
    }
  }

  const getRewardIcon = (reward: any) => {
    if (!reward || !reward.type) return <Trophy className="h-4 w-4" />
    
    switch (reward.type) {
      case "usd":
        return <DollarSign className="h-4 w-4" />
      case "points":
        return <Star className="h-4 w-4" />
      case "badge":
        return <Award className="h-4 w-4" />
      default:
        return <Trophy className="h-4 w-4" />
    }
  }

  const activeBounties = bounties.filter(b => b.status === "active").length
  const completedBounties = bounties.filter(b => b.status === "completed").length
  const totalRewards = bounties
    .filter(b => b.status === "completed")
    .reduce((sum, b) => {
      if (b.reward && b.reward.type === "usd") {
        return sum + (b.reward.amount || 0)
      }
      return sum
    }, 0)

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-2">Bounties</h1>
            <p className="text-muted-foreground">Reward members for valuable contributions</p>
          </div>
          <BountyForm />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass rounded-2xl p-6 border border-border/50">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="h-5 w-5 text-primary" />
              <span className="text-2xl font-semibold">{completedBounties}</span>
            </div>
            <p className="text-sm text-muted-foreground">Total Completed</p>
          </div>

          <div className="glass rounded-2xl p-6 border border-border/50">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="text-2xl font-semibold">{activeBounties}</span>
            </div>
            <p className="text-sm text-muted-foreground">Active Bounties</p>
          </div>

          <div className="glass rounded-2xl p-6 border border-border/50">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-2xl font-semibold">{formatReward(totalRewards)}</span>
            </div>
            <p className="text-sm text-muted-foreground">Total Rewards</p>
          </div>
        </div>

        <div className="space-y-4">
          {bounties.map((bounty) => (
            <div key={bounty.id} className="glass rounded-2xl p-6 border border-border/50 card-hover">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{bounty.title}</h3>
                    {bounty.status === "completed" ? (
                      <span className="flex items-center gap-1 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                        <CheckCircle2 className="h-3 w-3" />
                        Completed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        <Clock className="h-3 w-3" />
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{bounty.participants} participants</span>
                    <span>•</span>
                    <span>{formatDeadline(bounty.deadline)}</span>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    {getRewardIcon(bounty.reward)}
                    <div>
                      <p className="text-2xl font-semibold text-primary">{formatReward(bounty.reward)}</p>
                      <p className="text-xs text-muted-foreground">Reward</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {bounty.status === "active" && (
                      <CompleteBountyButton bountyId={bounty.id} />
                    )}
                    <DeleteBountyButton bountyId={bounty.id} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
