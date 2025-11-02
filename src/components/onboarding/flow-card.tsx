"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

interface FlowCardProps {
  id: string
  name: string
  enabled: boolean
  stepCount: number
  updatedAt?: string
  selected: boolean
  onSelect: () => void
  onToggle: (enabled: boolean) => void
  description?: string
  isDefault?: boolean
}

export function FlowCard({
  id,
  name,
  enabled,
  stepCount,
  updatedAt,
  selected,
  onSelect,
  onToggle,
  description,
  isDefault,
}: FlowCardProps) {
  const lastUpdated = updatedAt
    ? new Date(updatedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "Never"

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      onClick={onSelect}
      className={cn(
        "cursor-pointer card-elevated transition-all duration-200",
        selected
          ? "border-primary/40 ring-1 ring-primary/20"
          : "hover:border-primary/30"
      )}
    >
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm truncate">
                {name}
              </h3>
              {isDefault && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  Default
                </Badge>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>{stepCount} steps</span>
            <span>•</span>
            <span className="truncate">{lastUpdated}</span>
          </div>
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2"
          >
            <Switch checked={enabled} onCheckedChange={onToggle} />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
