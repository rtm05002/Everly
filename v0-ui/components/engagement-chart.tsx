"use client"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { TrendingUp } from "lucide-react"

const data = [
  { date: "Jan 1", value: 4200 },
  { date: "Jan 8", value: 4800 },
  { date: "Jan 15", value: 5200 },
  { date: "Jan 22", value: 4900 },
  { date: "Jan 29", value: 6100 },
  { date: "Feb 5", value: 6800 },
  { date: "Feb 12", value: 7200 },
  { date: "Feb 19", value: 8100 },
  { date: "Feb 26", value: 8291 },
]

export function EngagementChart() {
  return (
    <div className="card-elevated p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight mb-1">Engagement Trend</h3>
          <p className="text-sm text-muted-foreground">Daily active users over the last 60 days</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success">
          <TrendingUp className="h-4 w-4" />
          <span className="text-sm font-semibold">+18.2%</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.75rem",
              fontSize: "12px",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
            labelStyle={{
              color: "hsl(var(--foreground))",
              fontWeight: 600,
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={2.5}
            fill="url(#colorValue)"
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
