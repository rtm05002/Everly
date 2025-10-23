"use client"

import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface KpiCardProps {
  title: string
  value: string
  change: number
  icon: LucideIcon
  trend: "up" | "down"
}

export function KpiCard({ title, value, change, icon: Icon, trend }: KpiCardProps) {
  return (
    <div className="group card-elevated p-6 transition-all duration-300 hover:scale-[1.02]">
      <div className="flex items-start justify-between mb-4">
        <div
          className={cn(
            "rounded-xl p-3 transition-all duration-300",
            trend === "up"
              ? "bg-success/ text-success group-hover:bg-success/"
              : "bg-primary/ text-primary group-hover:bg-primary/",
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>

        <div
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold",
            trend === "up" ? "bg-success/ text-success" : "bg-destructive/ text-destructive",
          )}
        >
          {trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(change)}%
        </div>
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-1 font-medium">{title}</p>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
      </div>
    </div>
  )
}

