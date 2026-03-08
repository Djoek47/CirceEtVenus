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
}

export function AnalyticsCharts({ analytics }: AnalyticsChartsProps) {
  const chartData = analytics.length > 0 
    ? analytics.slice(0, 14).reverse().map((a) => ({
        date: new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: a.revenue,
        subscribers: a.subscribers,
        messages: a.messages_received,
        newFans: a.new_fans,
      }))
    : generateSampleData()

  return (
    <Tabs defaultValue="revenue" className="w-full">
      <TabsList className="bg-secondary">
        <TabsTrigger value="revenue">Revenue</TabsTrigger>
        <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
        <TabsTrigger value="engagement">Engagement</TabsTrigger>
      </TabsList>

      <TabsContent value="revenue">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Daily earnings over the past 14 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
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
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Subscriber Growth</CardTitle>
            <CardDescription>New fans acquired over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
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
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Message Activity</CardTitle>
            <CardDescription>Messages received daily</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
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

function generateSampleData() {
  const data = []
  const today = new Date()
  for (let i = 13; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: Math.floor(Math.random() * 500) + 200,
      subscribers: Math.floor(Math.random() * 20) + 980,
      messages: Math.floor(Math.random() * 100) + 50,
      newFans: Math.floor(Math.random() * 30) + 5,
    })
  }
  return data
}
