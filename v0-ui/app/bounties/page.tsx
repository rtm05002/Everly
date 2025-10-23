import { DashboardLayout } from "@/components/dashboard-layout"
import { Trophy, Clock, CheckCircle2, DollarSign } from "lucide-react"

const bounties = [
  {
    id: 1,
    title: "Create a welcome video",
    reward: "$50",
    status: "active",
    participants: 12,
    deadline: "3 days left",
  },
  {
    id: 2,
    title: "Write a community guide",
    reward: "$100",
    status: "active",
    participants: 8,
    deadline: "5 days left",
  },
  {
    id: 3,
    title: "Design social media templates",
    reward: "$75",
    status: "completed",
    participants: 15,
    deadline: "Completed",
  },
]

export default function BountiesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-2">Bounties</h1>
            <p className="text-muted-foreground">Reward members for valuable contributions</p>
          </div>
          <button className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all">
            Create Bounty
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass rounded-2xl p-6 border border-border/50">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="h-5 w-5 text-primary" />
              <span className="text-2xl font-semibold">234</span>
            </div>
            <p className="text-sm text-muted-foreground">Total Completed</p>
          </div>

          <div className="glass rounded-2xl p-6 border border-border/50">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="text-2xl font-semibold">18</span>
            </div>
            <p className="text-sm text-muted-foreground">Active Bounties</p>
          </div>

          <div className="glass rounded-2xl p-6 border border-border/50">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-2xl font-semibold">$12.4k</span>
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
                    <span>{bounty.deadline}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-primary">{bounty.reward}</p>
                  <p className="text-xs text-muted-foreground">Reward</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
