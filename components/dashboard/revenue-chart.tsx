'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts'
import type { AnalyticsSnapshot } from '@/lib/types'

interface RevenueChartProps {
  analytics: AnalyticsSnapshot[]
}

export function RevenueChart({ analytics }: RevenueChartProps) {
  // Process analytics data for chart - only use real data
  const chartData = analytics.slice(0, 14).reverse().map((a) => ({
    date: new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: a.revenue || 0,
    totalFans: a.total_fans || 0,
  }))

  const hasData = chartData.length > 0 && chartData.some(d => d.revenue > 0)

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>Revenue Overview</CardTitle>
        <CardDescription>Your earnings across all platforms</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-[300px] flex-col items-center justify-center text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-lg font-medium">No Revenue Data Yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Connect your platforms to start tracking your earnings and see your revenue chart.
            </p>
          </div>
        ) : (
          <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.75 0.18 195)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="oklch(0.75 0.18 195)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.015 260)" />
              <XAxis 
                dataKey="date" 
                stroke="oklch(0.65 0 0)" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="oklch(0.65 0 0)" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'oklch(0.16 0.01 260)',
                  border: '1px solid oklch(0.25 0.015 260)',
                  borderRadius: '8px',
                  color: 'oklch(0.95 0 0)'
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="oklch(0.75 0.18 195)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRevenue)"
                name="Revenue"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        )}
      </CardContent>
    </Card>
  )
}
