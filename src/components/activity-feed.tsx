"use client"

import { MessageSquare, Trophy, UserPlus, Star } from "lucide-react"
import { cn } from "@/lib/utils"

const activities = [
  {
    id: 1,
    type: "message",
    user: "Sarah Chen",
    action: "posted in #general",
    time: "2m ago",
    icon: MessageSquare,
    color: "primary",
  },
  {
    id: 2,
    type: "bounty",
    user: "Alex Rivera",
    action: "completed a bounty",
    time: "15m ago",
    icon: Trophy,
    color: "success",
  },
  {
    id: 3,
    type: "member",
    user: "Jordan Lee",
    action: "joined the community",
    time: "1h ago",
    icon: UserPlus,
    color: "primary",
  },
  {
    id: 4,
    type: "achievement",
    user: "Morgan Blake",
    action: "earned a new badge",
    time: "2h ago",
    icon: Star,
    color: "success",
  },
  {
    id: 5,
    type: "message",
    user: "Taylor Swift",
    action: "posted in #announcements",
    time: "3h ago",
    icon: MessageSquare,
    color: "primary",
  },
]

export function ActivityFeed() {
  return (
    <div className="card-elevated p-6 h-full flex flex-col">
      <div className="mb-6">
        <h3 className="text-lg font-semibold tracking-tight mb-1">Recent Activity</h3>
        <p className="text-sm text-muted-foreground">Latest community updates</p>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-3 rounded-xl hover:bg-secondary/ transition-all duration-200 cursor-pointer group"
          >
            <div
              className={cn(
                "rounded-xl p-2.5 transition-all duration-200",
                activity.color === "success"
                  ? "bg-success/ text-success group-hover:bg-success/"
                  : "bg-primary/ text-primary group-hover:bg-primary/",
              )}
            >
              <activity.icon className="h-4 w-4" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{activity.user}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{activity.action}</p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
          </div>
        ))}
      </div>

      <button className="mt-4 w-full py-2 text-sm font-medium text-primary hover:text-primary/ transition-colors">
        View All Activity
      </button>
    </div>
  )
}

