'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { AnalyticsSnapshot } from '@/lib/types'

interface AnalyticsChartsProps {
  analytics: AnalyticsSnapshot[]
  hasConnections?: boolean
}

export function AnalyticsCharts({ analytics, hasConnections = false }: AnalyticsChartsProps) {
  // If we have analytics data (even with zeros), show the charts
  // Generate last 14 days if we have any data at all
  let chartData: { date: string; revenue: number; totalFans: number; messages: number; newFans: number }[] = []
  
  if (analytics.length > 0) {
    chartData = analytics.slice(0, 14).reverse().map((a) => ({
      date: new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: a.revenue || 0,
      totalFans: a.total_fans || 0,
      // Engagement should reflect total activity, not just unread/new messages
      messages: (a.messages_received || 0) + (a.messages_sent || 0),
      newFans: a.new_fans || 0,
    }))
  } else {
    // Generate placeholder data for last 7 days showing zeros (connected but no activity)
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      chartData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: 0,
        totalFans: 0,
        messages: 0,
        newFans: 0,
      })
    }
  }

  // Only show empty state if truly no data and no connected platforms
  if (analytics.length === 0 && !hasConnections) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium">No Analytics Data Yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Connect your platforms and sync data to see your analytics charts here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Tabs defaultValue="revenue" className="w-full min-w-0">
      <TabsList className="bg-secondary overflow-x-auto">
        <TabsTrigger value="revenue">Revenue</TabsTrigger>
        <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
        <TabsTrigger value="engagement">Engagement</TabsTrigger>
      </TabsList>

      <TabsContent value="revenue">
        <Card className="min-w-0 border-border bg-card overflow-hidden">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Daily earnings over the past 14 days</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="h-[300px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.75 0.18 195)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.75 0.18 195)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.015 260)" />
                  <XAxis dataKey="date" stroke="oklch(0.65 0 0)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.65 0 0)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'oklch(0.16 0.01 260)',
                      border: '1px solid oklch(0.25 0.015 260)',
                      borderRadius: '8px',
                      color: 'oklch(0.95 0 0)'
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="oklch(0.75 0.18 195)" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="subscribers">
        <Card className="min-w-0 border-border bg-card overflow-hidden">
          <CardHeader>
            <CardTitle>Subscriber Growth</CardTitle>
            <CardDescription>New fans acquired over time</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="h-[300px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.015 260)" />
                  <XAxis dataKey="date" stroke="oklch(0.65 0 0)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.65 0 0)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'oklch(0.16 0.01 260)',
                      border: '1px solid oklch(0.25 0.015 260)',
                      borderRadius: '8px',
                      color: 'oklch(0.95 0 0)'
                    }}
                  />
                  <Bar dataKey="newFans" fill="oklch(0.7 0.2 150)" radius={[4, 4, 0, 0]} name="New Fans" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="engagement">
        <Card className="min-w-0 border-border bg-card overflow-hidden">
          <CardHeader>
            <CardTitle>Message Activity</CardTitle>
            <CardDescription>Messages received daily</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="h-[300px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.65 0.22 330)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.65 0.22 330)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.015 260)" />
                  <XAxis dataKey="date" stroke="oklch(0.65 0 0)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.65 0 0)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'oklch(0.16 0.01 260)',
                      border: '1px solid oklch(0.25 0.015 260)',
                      borderRadius: '8px',
                      color: 'oklch(0.95 0 0)'
                    }}
                  />
                  <Area type="monotone" dataKey="messages" stroke="oklch(0.65 0.22 330)" strokeWidth={2} fillOpacity={1} fill="url(#colorMessages)" name="Messages" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
