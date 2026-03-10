'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Shield, Bell, ArrowRight, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { LeakAlert, ReputationMention } from '@/lib/types'

interface AlertsWidgetProps {
  leakAlerts: LeakAlert[]
  mentions: ReputationMention[]
}

const severityColors = {
  critical: 'bg-destructive/20 text-destructive border-destructive/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
}

const sentimentColors = {
  positive: 'bg-chart-2/20 text-chart-2 border-chart-2/30',
  neutral: 'bg-muted text-muted-foreground border-border',
  negative: 'bg-destructive/20 text-destructive border-destructive/30',
}

export function AlertsWidget({ leakAlerts, mentions }: AlertsWidgetProps) {
  const hasAnyData = leakAlerts.length > 0 || mentions.length > 0

  if (!hasAnyData) {
    return (
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle>Alerts & Monitoring</CardTitle>
          <CardDescription>Stay on top of important updates</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <Shield className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">No Alerts Yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Connect your platforms to start monitoring for leaks and mentions.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle>Alerts & Monitoring</CardTitle>
        <CardDescription>Stay on top of important updates</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="leaks" className="w-full">
          <TabsList className="mb-4 w-full bg-secondary">
            <TabsTrigger value="leaks" className="flex-1 gap-2">
              <Shield className="h-4 w-4" />
              Leaks
              {leakAlerts.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                  {leakAlerts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="mentions" className="flex-1 gap-2">
              <Bell className="h-4 w-4" />
              Mentions
              {mentions.length > 0 && (
                <Badge className="ml-1 h-5 bg-primary px-1.5 text-xs">
                  {mentions.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leaks" className="space-y-3">
            {leakAlerts.slice(0, 3).map((alert) => (
              <div
                key={alert.id}
                className="flex items-start justify-between rounded-lg border border-border bg-secondary/30 p-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn('text-xs capitalize', severityColors[alert.severity])}>
                      {alert.severity}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{alert.source_platform}</span>
                  </div>
                  <p className="line-clamp-1 text-sm">{truncateUrl(alert.source_url)}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Link href="/dashboard/protection">
              <Button variant="ghost" size="sm" className="w-full gap-1">
                View All Alerts <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </TabsContent>

          <TabsContent value="mentions" className="space-y-3">
            {mentions.slice(0, 3).map((mention) => (
              <div
                key={mention.id}
                className="flex items-start justify-between rounded-lg border border-border bg-secondary/30 p-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn('text-xs capitalize', sentimentColors[mention.sentiment])}>
                      {mention.sentiment}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{mention.platform}</span>
                  </div>
                  <p className="line-clamp-2 text-sm">{mention.content_snippet}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Link href="/dashboard/mentions">
              <Button variant="ghost" size="sm" className="w-full gap-1">
                View All Mentions <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function truncateUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname + urlObj.pathname.slice(0, 20) + '...'
  } catch {
    return url.slice(0, 40) + '...'
  }
}
