"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useState, useTransition, useEffect } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "lucide-react"

const RANGE_OPTIONS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "60d", label: "Last 60 days" },
  { value: "90d", label: "Last 90 days" },
] as const

interface OverviewPageClientProps {
  children: React.ReactNode
  defaultRange?: string
}

export function OverviewPageClient({ children, defaultRange = "7d" }: OverviewPageClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [range, setRange] = useState(searchParams.get("range") || defaultRange)

  // Sync local state with URL params when they change
  useEffect(() => {
    const urlRange = searchParams.get("range")
    if (urlRange && urlRange !== range) {
      setRange(urlRange)
    }
  }, [searchParams])

  const handleRangeChange = (newRange: string) => {
    setRange(newRange)
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("range", newRange)
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Select value={range} onValueChange={handleRangeChange} disabled={isPending}>
          <SelectTrigger className="w-[140px] bg-transparent">
            <SelectValue>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {RANGE_OPTIONS.find((opt) => opt.value === range)?.label || "Last 60 days"}
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isPending ? (
        <div className="space-y-6">
          {/* Skeleton for KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="card-elevated p-6 animate-pulse"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-secondary rounded-xl" />
                  <div className="w-16 h-6 bg-secondary rounded-full" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-secondary rounded" />
                  <div className="h-8 w-32 bg-secondary rounded" />
                </div>
              </div>
            ))}
          </div>
          
          {/* Skeleton for chart */}
          <div className="card-elevated p-6 animate-pulse">
            <div className="h-64 bg-secondary rounded" />
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  )
}

