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
  // Group analytics by date and platform
  const dataByDate = new Map<string, { onlyfans: number; fansly: number; total: number }>()
  
  analytics.slice(0, 30).forEach((a) => {
    const date = new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const existing = dataByDate.get(date) || { onlyfans: 0, fansly: 0, total: 0 }
    
    if (a.platform === 'onlyfans') {
      existing.onlyfans += a.revenue || 0
    } else if (a.platform === 'fansly') {
      existing.fansly += a.revenue || 0
    }
    existing.total += a.revenue || 0
    
    dataByDate.set(date, existing)
  })
  
  // Convert to array and reverse for chronological order
  const chartData = Array.from(dataByDate.entries())
    .slice(0, 14)
    .reverse()
    .map(([date, data]) => ({
      date,
      onlyfans: data.onlyfans,
      fansly: data.fansly,
      total: data.total,
    }))

  const hasData = chartData.length > 0 && chartData.some(d => d.total > 0)
  const hasOnlyFans = chartData.some(d => d.onlyfans > 0)
  const hasFansly = chartData.some(d => d.fansly > 0)

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
                {/* OnlyFans gradient - blue */}
                <linearGradient id="colorOnlyFans" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00AFF0" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#00AFF0" stopOpacity={0} />
                </linearGradient>
                {/* Fansly gradient - teal */}
                <linearGradient id="colorFansly" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#009FFF" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#009FFF" stopOpacity={0} />
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
                formatter={(value: number, name: string) => [
                  `$${value.toLocaleString()}`, 
                  name === 'onlyfans' ? 'OnlyFans' : name === 'fansly' ? 'Fansly' : 'Total'
                ]}
              />
              <Legend 
                formatter={(value) => value === 'onlyfans' ? 'OnlyFans' : value === 'fansly' ? 'Fansly' : 'Total'}
              />
              {hasOnlyFans && (
                <Area
                  type="monotone"
                  dataKey="onlyfans"
                  stroke="#00AFF0"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorOnlyFans)"
                  name="onlyfans"
                  stackId="1"
                />
              )}
              {hasFansly && (
                <Area
                  type="monotone"
                  dataKey="fansly"
                  stroke="#009FFF"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorFansly)"
                  name="fansly"
                  stackId="1"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        )}
      </CardContent>
    </Card>
  )
}
