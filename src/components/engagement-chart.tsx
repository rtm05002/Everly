"use client"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { TrendingUp, BarChart3 } from "lucide-react"
import { TrendPoint } from "@/lib/types"
import { Empty } from "@/components/ui/empty"

interface EngagementChartProps {
  data?: TrendPoint[] | null
  days?: number
}

export function EngagementChart({ data, days = 60 }: EngagementChartProps) {
  const safe = Array.isArray(data) ? data : []
  
  // Show empty state only if we have no data points at all
  if (safe.length === 0) {
    return (
      <div className="card-elevated p-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold tracking-tight mb-1">Engagement Trend</h3>
            <p className="text-sm text-muted-foreground">Daily active users over the last {days} days</p>
          </div>
        </div>
        
        <Empty
          icon={BarChart3}
          title="No data in range"
          description="We don't have any activity data for this period. Try selecting a different date range or check back later."
        />
      </div>
    )
  }

  // Transform data for the chart
  const chartData = safe.map((point) => ({
    date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: point.dau,
    isoDate: point.date // Keep ISO date for tooltip formatting
  }))

  // Calculate trend percentage
  const firstValue = chartData[0]?.value || 0
  const lastValue = chartData[chartData.length - 1]?.value || 0
  const trendPercentage = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0

  // Calculate Y-axis bounds with nice steps
  const maxValue = Math.max(...chartData.map(d => d.value))
  const minValue = 0 // Always clamp to 0
  const domainMax = maxValue === 0 ? 10 : Math.ceil(maxValue / 5) * 5 // Round up to nearest 5

  // Check if last 20% of data is all zeros (for gradient fade effect)
  const trailingZeros = chartData.slice(-Math.ceil(chartData.length * 0.2)).filter(d => d.value === 0).length
  const shouldFadeGradient = trailingZeros > Math.ceil(chartData.length * 0.15)
  
  // Custom tooltip content
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value || 0
      const originalData = payload[0].payload
      const formattedDate = new Date(originalData.isoDate).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
      
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-foreground text-sm mb-1">{formattedDate}</p>
          <p className="text-foreground text-sm">
            {value.toLocaleString()} {value === 1 ? 'active user' : 'active users'}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="card-elevated p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight mb-1">Engagement Trend</h3>
          <p className="text-sm text-muted-foreground">Daily active users over the last {days} days</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${trendPercentage >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          <TrendingUp className={`h-4 w-4 ${trendPercentage < 0 ? 'rotate-180' : ''}`} />
          <span className="text-sm font-semibold">
            {trendPercentage >= 0 ? '+' : ''}{trendPercentage.toFixed(1)}%
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart 
          data={chartData}
          margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop 
                offset="95%" 
                stopColor="hsl(var(--primary))" 
                stopOpacity={shouldFadeGradient ? 0.1 : 0} 
              />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis 
            dataKey="date" 
            stroke="hsl(var(--muted-foreground))" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false}
          />
          <YAxis 
            domain={[minValue, domainMax]}
            stroke="hsl(var(--muted-foreground))" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false}
            allowDataOverflow={false}
          />
          <Tooltip
            content={<CustomTooltip />}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={2.5}
            fill="url(#colorValue)"
            dot={false}
            activeDot={{ r: 4 }}
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

