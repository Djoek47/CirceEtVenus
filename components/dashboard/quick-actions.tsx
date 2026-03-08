'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Upload, MessageSquare, BarChart3 } from 'lucide-react'
import Link from 'next/link'

export function QuickActions() {
  const actions = [
    {
      icon: Upload,
      label: 'Upload Content',
      description: 'Add new photos or videos',
      href: '/dashboard/content/new',
      color: 'bg-chart-1/10 text-chart-1',
    },
    {
      icon: Plus,
      label: 'Add Fan',
      description: 'Manually add a fan profile',
      href: '/dashboard/fans/new',
      color: 'bg-chart-2/10 text-chart-2',
    },
    {
      icon: MessageSquare,
      label: 'Mass Message',
      description: 'Send to multiple fans',
      href: '/dashboard/messages/mass',
      color: 'bg-chart-3/10 text-chart-3',
    },
    {
      icon: BarChart3,
      label: 'View Reports',
      description: 'Detailed analytics',
      href: '/dashboard/analytics',
      color: 'bg-chart-4/10 text-chart-4',
    },
  ]

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks at your fingertips</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {actions.map((action) => (
            <Link key={action.label} href={action.href}>
              <Button
                variant="outline"
                className="h-auto w-full justify-start gap-3 border-border bg-secondary/30 p-4 hover:bg-secondary/50"
              >
                <div className={`rounded-lg p-2 ${action.color}`}>
                  <action.icon className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <p className="font-medium">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
