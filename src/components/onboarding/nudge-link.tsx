"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface NudgeLinkProps {
  nudgeRecipeId: string
  hubId: string
}

interface NudgeRecipe {
  id: string
  name: string
  trigger?: {
    type: string
    gte?: number
  }
  frequency?: {
    period: string
    max_per_member: number
  }
}

export function NudgeLink({ nudgeRecipeId, hubId }: NudgeLinkProps) {
  const [nudge, setNudge] = useState<NudgeRecipe | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNudge = async () => {
      try {
        // TODO: Create API endpoint to fetch nudge recipe by ID
        // For now, we'll just show a placeholder
        setNudge({
          id: nudgeRecipeId,
          name: "Reminder",
          trigger: { type: "inactive_days", gte: 3 },
          frequency: { period: "week", max_per_member: 1 },
        })
      } catch (err) {
        console.error("Error fetching nudge:", err)
      } finally {
        setLoading(false)
      }
    }
    if (nudgeRecipeId) {
      fetchNudge()
    }
  }, [nudgeRecipeId, hubId])

  if (loading || !nudge) return null

  const getReminderText = () => {
    if (nudge.trigger?.type === "inactive_days" && nudge.trigger.gte) {
      return `${nudge.trigger.gte} days after join`
    }
    return "Reminder"
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="text-xs gap-1 cursor-pointer hover:bg-accent"
          >
            <Clock className="h-3 w-3" />
            Reminder: {getReminderText()}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <div className="font-medium">{nudge.name}</div>
            <div className="text-muted-foreground mt-1">
              Sends {nudge.frequency?.max_per_member || 1}x per {nudge.frequency?.period || "week"}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

