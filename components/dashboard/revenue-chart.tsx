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
  // Process analytics data for chart
  const chartData = analytics.length > 0 
    ? analytics.slice(0, 14).reverse().map((a) => ({
        date: new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: a.revenue,
        subscribers: a.subscribers,
      }))
    : generateSampleData()

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>Revenue Overview</CardTitle>
        <CardDescription>Your earnings across all platforms</CardDescription>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  )
}

function generateSampleData() {
  const data = []
  const today = new Date()
  for (let i = 13; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: Math.floor(Math.random() * 500) + 200,
      subscribers: Math.floor(Math.random() * 50) + 100,
    })
  }
  return data
}
