import { DashboardLayout } from "@/components/dashboard-layout"
import { LoadingSkeleton } from "@/components/loading-skeleton"

export default function Loading() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-2">Overview</h1>
            <p className="text-muted-foreground">Track your community's engagement and growth metrics</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass rounded-2xl p-6 border border-border/50 animate-pulse">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-5 w-5 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded w-24"></div>
              </div>
              <div className="h-8 bg-muted rounded w-16 mb-2"></div>
              <div className="h-3 bg-muted rounded w-20"></div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass rounded-2xl p-6 border border-border/50 animate-pulse">
              <div className="h-4 bg-muted rounded w-32 mb-4"></div>
              <div className="h-64 bg-muted rounded"></div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="glass rounded-2xl p-6 border border-border/50 animate-pulse">
              <div className="h-4 bg-muted rounded w-24 mb-4"></div>
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-muted rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-3 bg-muted rounded w-3/4 mb-1"></div>
                      <div className="h-2 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}




