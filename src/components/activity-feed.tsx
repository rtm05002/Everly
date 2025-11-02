"use client"

import { MessageSquare, Trophy, UserPlus, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { Event } from "@/lib/types"

interface ActivityItem {
  id: string
  type: "message" | "bounty" | "member" | "achievement" | "warning"
  user: string
  action: string
  time: string
  icon: any
  color: "primary" | "success" | "warning" | "danger"
  chip?: string
  chipColor?: "primary" | "success" | "warning" | "danger"
}

interface ActivityFeedProps {
  activities?: Event[]
}

const defaultActivities: ActivityItem[] = [
  {
    id: "1",
    type: "message" as const,
    user: "Sarah Chen",
    action: "posted in #general",
    time: "2m ago",
    icon: MessageSquare,
    color: "primary" as const,
    chip: "#general",
    chipColor: "primary" as const
  },
  {
    id: "2",
    type: "bounty" as const,
    user: "Alex Rivera",
    action: "completed a bounty",
    time: "15m ago",
    icon: Trophy,
    color: "success" as const,
    chip: "+18.2%",
    chipColor: "success" as const
  },
  {
    id: "3",
    type: "member" as const,
    user: "Jordan Lee",
    action: "joined the community",
    time: "1h ago",
    icon: UserPlus,
    color: "primary" as const,
  },
  {
    id: "4",
    type: "achievement" as const,
    user: "Morgan Blake",
    action: "earned a new badge",
    time: "2h ago",
    icon: Star,
    color: "success" as const,
    chip: "New Badge",
    chipColor: "warning" as const
  },
  {
    id: "5",
    type: "warning" as const,
    user: "Taylor Swift",
    action: "posted in #announcements",
    time: "3h ago",
    icon: MessageSquare,
    color: "primary" as const,
    chip: "-3.1%",
    chipColor: "danger" as const
  },
]

// Convert Event to ActivityItem
function convertEventToActivityItem(event: Event): ActivityItem {
  const getTimeAgo = (timestamp: string): string => {
    const now = new Date()
    const eventTime = new Date(timestamp)
    const diffMs = now.getTime() - eventTime.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMinutes < 1) return 'just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const timeAgo = getTimeAgo(event.ts)
  
  switch (event.type) {
    case "joined":
      return {
        id: event.memberId,
        type: "member",
        user: `Member ${event.memberId.slice(0, 8)}`,
        action: "joined the community",
        time: timeAgo,
        icon: UserPlus,
        color: "primary"
      }
    case "posted":
      return {
        id: event.memberId,
        type: "message",
        user: `Member ${event.memberId.slice(0, 8)}`,
        action: "posted a message",
        time: timeAgo,
        icon: MessageSquare,
        color: "primary"
      }
    case "bounty_completed":
      return {
        id: event.memberId,
        type: "bounty",
        user: `Member ${event.memberId.slice(0, 8)}`,
        action: "completed a bounty",
        time: timeAgo,
        icon: Trophy,
        color: "success",
        chip: "Completed",
        chipColor: "success"
      }
    case "streak_missed":
      return {
        id: event.memberId,
        type: "warning",
        user: `Member ${event.memberId.slice(0, 8)}`,
        action: "missed their streak",
        time: timeAgo,
        icon: Star,
        color: "warning",
        chip: "Streak",
        chipColor: "warning"
      }
    case "announcement_received":
      return {
        id: event.memberId,
        type: "message",
        user: `Member ${event.memberId.slice(0, 8)}`,
        action: "received an announcement",
        time: timeAgo,
        icon: MessageSquare,
        color: "primary"
      }
    default:
      return {
        id: event.memberId,
        type: "message",
        user: `Member ${event.memberId.slice(0, 8)}`,
        action: "performed an action",
        time: timeAgo,
        icon: MessageSquare,
        color: "primary"
      }
  }
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  // Convert events to activity items, or use default if no events
  const activityItems = activities && activities.length > 0 
    ? activities.slice(0, 5).map((event, index) => ({
        ...convertEventToActivityItem(event),
        id: `${event.memberId}-${event.type}-${index}` // Ensure unique keys
      }))
    : defaultActivities

  return (
    <div className="card-elevated p-6 h-full flex flex-col">
      <div className="mb-6">
        <h3 className="text-lg font-semibold tracking-tight mb-1">Recent Activity</h3>
        <p className="text-sm text-muted-foreground">Latest community updates</p>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto">
        {activityItems.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-all duration-200 cursor-pointer group"
          >
            <div
              className={cn(
                "rounded-xl p-2.5 transition-all duration-200",
                activity.color === "success"
                  ? "bg-success/10 text-success group-hover:bg-success/20"
                  : activity.color === "warning"
                  ? "bg-warning/10 text-warning group-hover:bg-warning/20"
                  : "bg-primary/10 text-primary group-hover:bg-primary/20",
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

