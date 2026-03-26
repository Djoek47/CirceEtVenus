'use client'

import { useMemo, useState } from 'react'
import type { AnalyticsSnapshot, Content } from '@/lib/types'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { AnalyticsCharts } from '@/components/analytics/analytics-charts'
import { PlatformBreakdown } from '@/components/analytics/platform-breakdown'
import { TopContent } from '@/components/analytics/top-content'
import { OnlyFansApiAnalytics } from '@/components/analytics/onlyfans-api-analytics'

type Connection = {
  platform: string
  last_sync_at?: string | null
}

const PLATFORM_META: Record<
  string,
  { label: string; logoSrc: string; ring: string; bg: string }
> = {
  onlyfans: { label: 'OnlyFans', logoSrc: '/onlyfans-logo.png', ring: 'ring-sky-500/40', bg: 'bg-sky-500/10' },
  fansly: { label: 'Fansly', logoSrc: '/fansly-logo.png', ring: 'ring-blue-500/40', bg: 'bg-blue-500/10' },
  mym: { label: 'MYM', logoSrc: '', ring: 'ring-rose-500/40', bg: 'bg-rose-500/10' },
}

function formatNumber(amount: number): string {
  const str = Math.round(amount).toString()
  const parts: string[] = []
  for (let i = str.length; i > 0; i -= 3) parts.unshift(str.slice(Math.max(0, i - 3), i))
  return parts.join(',')
}

function formatLastSync(dateStr?: string | null) {
  if (!dateStr) return 'Never'
  const diffMins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const h = Math.floor(diffMins / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function AnalyticsDashboard({
  analytics,
  connections,
  content,
}: {
  analytics: AnalyticsSnapshot[]
  connections: Connection[]
  content: Content[]
}) {
  const connectedPlatforms = useMemo(
    () => Array.from(new Set((connections || []).map((c) => c.platform))).sort(),
    [connections],
  )

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(
    connectedPlatforms.length > 0 ? connectedPlatforms : [],
  )

  const filtered = useMemo(() => {
    if (selectedPlatforms.length === 0) return analytics
    return analytics.filter((a) => selectedPlatforms.includes(a.platform))
  }, [analytics, selectedPlatforms])

  const hasConnections = connectedPlatforms.length > 0

  const latestByPlatform = useMemo(() => {
    const m = new Map<string, AnalyticsSnapshot>()
    filtered.forEach((a) => {
      const prev = m.get(a.platform)
      if (!prev || new Date(a.date) > new Date(prev.date)) m.set(a.platform, a)
    })
    return m
  }, [filtered])

  const totals = useMemo(() => {
    const totalRevenue = filtered.reduce((sum, a) => sum + (a.revenue || 0), 0)
    const messagesReceived = filtered.reduce((sum, a) => sum + (a.messages_received || 0), 0)
    const messagesSent = filtered.reduce((sum, a) => sum + (a.messages_sent || 0), 0)
    const newFans = filtered.reduce((sum, a) => sum + (a.new_fans || 0), 0)
    const churned = filtered.reduce((sum, a) => sum + (a.churned_fans || 0), 0)
    const totalFans = Array.from(latestByPlatform.values()).reduce((sum, a) => sum + (a.total_fans || 0), 0)

    // Average response time: simple mean across latest snapshots that have it
    const responseSamples = Array.from(latestByPlatform.values())
      .map((a) => a.avg_response_time_minutes)
      .filter((n) => typeof n === 'number' && Number.isFinite(n) && n > 0)
    const avgResponse =
      responseSamples.length > 0
        ? responseSamples.reduce((s, n) => s + n, 0) / responseSamples.length
        : 0

    return { totalRevenue, messagesReceived, messagesSent, newFans, churned, totalFans, avgResponse }
  }, [filtered, latestByPlatform])

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform],
    )
  }

  const showAll = () => setSelectedPlatforms(connectedPlatforms)
  const showNone = () => setSelectedPlatforms([])

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground">Track your performance across all platforms</p>
        </div>

        {/* Platform filters */}
        <div className="flex flex-col sm:items-end gap-2 flex-wrap">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={showAll} disabled={!hasConnections}>
              All
            </Button>
            <Button size="sm" variant="ghost" onClick={showNone} disabled={!hasConnections}>
              Clear
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {connectedPlatforms.map((platform) => {
              const meta = PLATFORM_META[platform] || { label: platform, logoSrc: '', ring: 'ring-border', bg: 'bg-muted' }
              const selected = selectedPlatforms.includes(platform)
              const lastSync = connections.find((c) => c.platform === platform)?.last_sync_at
              return (
                <button
                  key={platform}
                  type="button"
                  onClick={() => togglePlatform(platform)}
                  className={cn(
                    'flex items-center gap-2 rounded-full px-3 py-2 text-sm transition',
                    'border border-border hover:bg-muted/50',
                    selected && 'ring-2 ring-offset-2 ring-offset-background',
                    selected && meta.ring,
                    selected && meta.bg,
                  )}
                  aria-pressed={selected}
                  title={`${meta.label} • Last synced: ${formatLastSync(lastSync)}`}
                >
                  {meta.logoSrc ? (
                    <img src={meta.logoSrc} alt={meta.label} className="h-4 w-4 rounded-sm" />
                  ) : null}
                  <span className="hidden sm:inline">{meta.label}</span>
                  <Badge variant="secondary" className="ml-1 text-[10px]">
                    {formatLastSync(lastSync)}
                  </Badge>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Overview Stats (filtered) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription>Total Revenue (30d)</CardDescription>
            <CardTitle className="text-3xl">
              {hasConnections ? `$${formatNumber(totals.totalRevenue)}` : '--'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription>Total Subscribers</CardDescription>
            <CardTitle className="text-3xl">
              {hasConnections ? formatNumber(totals.totalFans) : '--'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription>Messages Received (30d)</CardDescription>
            <CardTitle className="text-3xl">
              {hasConnections ? formatNumber(totals.messagesReceived) : '--'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription>Messages Sent (30d)</CardDescription>
            <CardTitle className="text-3xl">
              {hasConnections ? formatNumber(totals.messagesSent) : '--'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription>Net New Fans (30d)</CardDescription>
            <CardTitle className="text-3xl">
              {hasConnections ? formatNumber(totals.newFans - totals.churned) : '--'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription>Avg Response Time</CardDescription>
            <CardTitle className="text-3xl">
              {hasConnections ? `${Math.round(totals.avgResponse)}m` : '--'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {connectedPlatforms.includes('onlyfans') && (
        <OnlyFansApiAnalytics />
      )}

      {/* Charts */}
      <AnalyticsCharts analytics={filtered} hasConnections={hasConnections} />

      {/* Bottom Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PlatformBreakdown analytics={filtered} />
        <TopContent content={content || []} />
      </div>
    </div>
  )
}

