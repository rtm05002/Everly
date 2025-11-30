import * as React from "react"
import { Badge } from "@/components/ui/badge"

export function LastSyncBadge({ isoDate }: { isoDate?: string | null }) {
  if (!isoDate) {
    return (
      <Badge tone="warning">
        <Dot color="warning" />
        Never synced
      </Badge>
    )
  }

  const date = new Date(isoDate)
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000)
  const tone: "success" | "neutral" | "warning" =
    minutes < 30 ? "success" : minutes < 1440 ? "neutral" : "warning"

  return (
    <Badge tone={tone}>
      <Dot color={tone === "neutral" ? undefined : tone} />
      Last sync {date.toLocaleString()}
    </Badge>
  )
}

function Dot({ color }: { color?: "success" | "warning" }) {
  const map: Record<string, string> = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
  }
  const cls = color ? map[color] : "bg-zinc-400"
  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />
}

