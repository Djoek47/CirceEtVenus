'use client'

import { Card, CardContent } from '@/components/ui/card'
import { DollarSign, Users, MessageSquare, Calendar, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DashboardStats } from '@/lib/types'

// Manual number formatting to avoid hydration mismatch (no Intl/locale dependency)
function formatNumber(amount: number): string {
  const str = Math.round(amount).toString()
  const parts: string[] = []
  for (let i = str.length; i > 0; i -= 3) {
    parts.unshift(str.slice(Math.max(0, i - 3), i))
  }
  return parts.join(',')
}

interface StatsCardsProps {
  stats: DashboardStats
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: 'Total Revenue',
      value: `$${formatNumber(stats.totalRevenue)}`,
      change: stats.revenueChange,
      icon: DollarSign,
    },
    {
      title: 'Total Fans',
      value: formatNumber(stats.totalFans),
      change: stats.fansChange,
      icon: Users,
    },
    {
      title: 'Active Conversations',
      value: formatNumber(stats.activeConversations),
      change: stats.conversationsChange,
      icon: MessageSquare,
    },
    {
      title: 'Scheduled Content',
      value: formatNumber(stats.scheduledContent),
      change: stats.contentChange,
      icon: Calendar,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="mt-1 text-2xl font-bold">{card.value}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-3">
                <card.icon className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-sm">
              {card.change >= 0 ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span
                className={cn(
                  'font-medium',
                  card.change >= 0 ? 'text-success' : 'text-destructive'
                )}
              >
                {card.change >= 0 ? '+' : ''}
                {card.change}%
              </span>
              <span className="text-muted-foreground">vs last month</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
