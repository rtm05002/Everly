export function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="space-y-8">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted rounded"></div>
            <div className="h-4 w-72 bg-muted rounded"></div>
          </div>
          <div className="h-8 w-24 bg-muted rounded"></div>
        </div>

        {/* KPI cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="kpi-card">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-4 w-4 bg-muted rounded"></div>
                <div className="h-4 w-24 bg-muted rounded"></div>
                <div className="h-6 w-12 bg-muted rounded-full"></div>
              </div>
              <div className="h-8 w-20 bg-muted rounded"></div>
            </div>
          ))}
        </div>

        {/* Chart and activity skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="card-elevated p-6">
              <div className="mb-6 space-y-2">
                <div className="h-6 w-32 bg-muted rounded"></div>
                <div className="h-4 w-48 bg-muted rounded"></div>
              </div>
              <div className="h-[300px] w-full bg-muted rounded"></div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="card-elevated p-6">
              <div className="mb-6 space-y-2">
                <div className="h-6 w-28 bg-muted rounded"></div>
                <div className="h-4 w-36 bg-muted rounded"></div>
              </div>
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="h-8 w-8 bg-muted rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-full bg-muted rounded"></div>
                      <div className="h-3 w-3/4 bg-muted rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}











