import { createClient } from '@/lib/supabase/server'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { RecentFans } from '@/components/dashboard/recent-fans'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { AlertsWidget } from '@/components/dashboard/alerts-widget'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch dashboard data
  const [
    { data: fans },
    { data: content },
    { data: conversations },
    { data: leakAlerts },
    { data: mentions },
    { data: analytics },
  ] = await Promise.all([
    supabase.from('fans').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('content').select('*').eq('user_id', user.id).eq('status', 'scheduled'),
    supabase.from('conversations').select('*').eq('user_id', user.id).eq('status', 'active'),
    supabase.from('leak_alerts').select('*').eq('user_id', user.id).eq('status', 'detected').limit(5),
    supabase.from('reputation_mentions').select('*').eq('user_id', user.id).eq('is_reviewed', false).limit(5),
    supabase.from('analytics_snapshots').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(30),
  ])

  // Calculate stats
  const totalRevenue = analytics?.reduce((sum, a) => sum + (a.revenue || 0), 0) || 0
  const totalFans = fans?.length || 0
  const activeConversations = conversations?.length || 0
  const scheduledContent = content?.length || 0

  const stats = {
    totalRevenue,
    revenueChange: 12.5,
    totalFans,
    fansChange: 8.2,
    activeConversations,
    conversationsChange: -3.1,
    scheduledContent,
    contentChange: 15.0,
    leakAlerts: leakAlerts?.length || 0,
    mentionsToReview: mentions?.length || 0,
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <StatsCards stats={stats} />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Chart - Takes 2 columns */}
        <div className="lg:col-span-2">
          <RevenueChart analytics={analytics || []} />
        </div>

        {/* Quick Actions */}
        <QuickActions />
      </div>

      {/* Bottom Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Fans */}
        <RecentFans fans={fans || []} />

        {/* Alerts & Mentions */}
        <AlertsWidget leakAlerts={leakAlerts || []} mentions={mentions || []} />
      </div>
    </div>
  )
}
