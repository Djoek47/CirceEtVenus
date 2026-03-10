import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AnalyticsCharts } from '@/components/analytics/analytics-charts'
import { PlatformBreakdown } from '@/components/analytics/platform-breakdown'
import { TopContent } from '@/components/analytics/top-content'
import { ConnectedPlatforms } from '@/components/dashboard/connected-platforms'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Check for platform connections
  const { data: connections } = await supabase
    .from('platform_connections')
    .select('platform, is_connected, last_sync_at')
    .eq('user_id', user.id)
    .eq('is_connected', true)

  const { data: analytics } = await supabase
    .from('analytics_snapshots')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(30)
  
  // Pass connection info to show "connected" state even if no analytics yet
  const hasConnections = (connections?.length || 0) > 0

  const { data: content } = await supabase
    .from('content')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground">Track your performance across all platforms</p>
        </div>
        <ConnectedPlatforms />
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription>Total Revenue (30d)</CardDescription>
            <CardTitle className="text-3xl">
              ${analytics?.reduce((sum, a) => sum + (a.revenue || 0), 0).toLocaleString() || '0'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription>Total Subscribers</CardDescription>
            <CardTitle className="text-3xl">
              {analytics?.[0]?.total_fans?.toLocaleString() || '0'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription>Messages Received (30d)</CardDescription>
            <CardTitle className="text-3xl">
              {analytics?.reduce((sum, a) => sum + (a.messages_received || 0), 0).toLocaleString() || '0'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription>New Fans (30d)</CardDescription>
            <CardTitle className="text-3xl">
              {analytics?.reduce((sum, a) => sum + (a.new_fans || 0), 0).toLocaleString() || '0'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Charts */}
      <AnalyticsCharts analytics={analytics || []} hasConnections={hasConnections} />

      {/* Bottom Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PlatformBreakdown analytics={analytics || []} />
        <TopContent content={content || []} />
      </div>
    </div>
  )
}
