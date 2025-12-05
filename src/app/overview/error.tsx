"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-2">Overview</h1>
            <p className="text-muted-foreground">Track your community's engagement and growth metrics</p>
          </div>
        </div>

        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4 max-w-md">
            <div className="flex justify-center">
              <div className="rounded-full bg-destructive/10 p-3">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
              <p className="text-muted-foreground">
                We couldn't load your overview data. This might be due to a connection issue or server problem.
              </p>
            </div>

            <div className="space-y-2">
              <Button onClick={reset} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try again
              </Button>
              <p className="text-xs text-muted-foreground">
                Error ID: {error.digest || 'unknown'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}











