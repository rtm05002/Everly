"use client"

import { OnboardingStep } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Clock, UserCheck, Zap } from "lucide-react"

interface StepStatusChipProps {
  step: OnboardingStep
}

/**
 * Determines if a step can auto-complete based on its kind and config
 */
function canAutoComplete(step: OnboardingStep): "auto" | "manual" | "mixed" {
  const { kind, config } = step

  switch (kind) {
    case "read":
      // Auto if URL is configured
      return config?.url ? "auto" : "manual"
    case "post":
      // Auto if channel_id is configured
      return config?.channel_id ? "auto" : "manual"
    case "join":
      // Auto if channels array is configured
      return config?.channels && Array.isArray(config.channels) && config.channels.length > 0
        ? "auto"
        : "manual"
    case "custom":
      // Auto if bounty_id or webhook_url is configured
      return config?.bounty_id || config?.webhook_url ? "auto" : "manual"
    case "connect":
      // Auto if any toggle is enabled
      return config?.enable_mentions || config?.enable_email || config?.enable_dm
        ? "auto"
        : "manual"
    default:
      return "manual"
  }
}

export function StepStatusChip({ step }: StepStatusChipProps) {
  const status = canAutoComplete(step)

  if (status === "auto") {
    return (
      <Badge variant="secondary" className="text-xs gap-1 bg-green-100 text-green-700 border-green-200">
        <Zap className="h-3 w-3" />
        Auto
      </Badge>
    )
  }

  if (status === "mixed") {
    return (
      <Badge variant="secondary" className="text-xs gap-1 bg-amber-100 text-amber-700 border-amber-200">
        <Clock className="h-3 w-3" />
        Mixed
      </Badge>
    )
  }

  return (
    <Badge variant="secondary" className="text-xs gap-1 bg-slate-100 text-slate-700 border-slate-200">
      <UserCheck className="h-3 w-3" />
      Manual
    </Badge>
  )
}

