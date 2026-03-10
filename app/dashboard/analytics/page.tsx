import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AnalyticsCharts } from '@/components/analytics/analytics-charts'
import { PlatformBreakdown } from '@/components/analytics/platform-breakdown'
import { TopContent } from '@/components/analytics/top-content'
import { ConnectedPlatforms } from '@/components/dashboard/connected-platforms'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Check if we have analytics data, if not try to sync
  let { data: analytics } = await supabase
    .from('analytics_snapshots')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(30)

  // If no analytics data, try to auto-sync from OnlyFans
  if (!analytics || analytics.length === 0) {
    try {
      const api = createOnlyFansAPI()
      const accountsResult = await api.listAccounts()
      
      if (accountsResult.success && accountsResult.accounts && accountsResult.accounts.length > 0) {
        const account = accountsResult.accounts[accountsResult.accounts.length - 1]
        const userData = (account as any)?.onlyfans_user_data || {}
        
        // Ensure connection exists
        await supabase
          .from('platform_connections')
          .delete()
          .eq('user_id', user.id)
          .eq('platform', 'onlyfans')
        
        await supabase
          .from('platform_connections')
          .insert({
            user_id: user.id,
            platform: 'onlyfans',
            platform_username: account.onlyfans_username || 'Connected',
            is_connected: true,
            access_token: account.id,
            last_sync_at: new Date().toISOString(),
          })
        
        // Insert today's analytics snapshot with data from userData
        const today = new Date().toISOString().split('T')[0]
        await supabase.from('analytics_snapshots')
          .delete()
          .eq('user_id', user.id)
          .eq('platform', 'onlyfans')
          .eq('date', today)
        
        await supabase.from('analytics_snapshots').insert({
          user_id: user.id,
          platform: 'onlyfans',
          date: today,
          total_fans: userData.subscribesCount || 0,
          new_fans: 0,
          churned_fans: 0,
          revenue: 0,
          messages_received: 0,
          messages_sent: 0,
        })
        
        // Re-fetch analytics
        const { data: newAnalytics } = await supabase
          .from('analytics_snapshots')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(30)
        
        analytics = newAnalytics
      }
    } catch (e) {
      // Silent fail
    }
  }

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
      <AnalyticsCharts analytics={analytics || []} />

      {/* Bottom Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PlatformBreakdown analytics={analytics || []} />
        <TopContent content={content || []} />
      </div>
    </div>
  )
}
