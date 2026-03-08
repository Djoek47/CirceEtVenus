'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import type { AnalyticsSnapshot } from '@/lib/types'

interface PlatformBreakdownProps {
  analytics: AnalyticsSnapshot[]
}

export function PlatformBreakdown({ analytics }: PlatformBreakdownProps) {
  // Aggregate by platform
  const platformData = analytics.length > 0
    ? aggregateByPlatform(analytics)
    : [
        { name: 'OnlyFans', value: 6500, color: '#00AFF0' },
        { name: 'Fansly', value: 2800, color: '#009FFF' },
        { name: 'MYM', value: 1200, color: '#FF4D67' },
      ]

  const total = platformData.reduce((sum, p) => sum + p.value, 0)

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>Platform Breakdown</CardTitle>
        <CardDescription>Revenue distribution by platform</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={platformData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
              >
                {platformData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
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
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 space-y-2">
          {platformData.map((platform) => (
            <div key={platform.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: platform.color }}
                />
                <span>{platform.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">${platform.value.toLocaleString()}</span>
                <span className="text-muted-foreground">
                  ({((platform.value / total) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function aggregateByPlatform(analytics: AnalyticsSnapshot[]) {
  const platforms: Record<string, number> = {}
  analytics.forEach((a) => {
    const key = a.platform
    platforms[key] = (platforms[key] || 0) + (a.revenue || 0)
  })

  const colors: Record<string, string> = {
    onlyfans: '#00AFF0',
    fansly: '#009FFF',
    mym: '#FF4D67',
  }

  return Object.entries(platforms).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: colors[name] || '#888888',
  }))
}
