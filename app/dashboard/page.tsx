import { createClient } from '@/lib/supabase/server'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { RecentFans } from '@/components/dashboard/recent-fans'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { AlertsWidget } from '@/components/dashboard/alerts-widget'
import { PlatformIntegrationWidget } from '@/components/dashboard/platform-integration-widget'
import { SocialReputationWidget } from '@/components/dashboard/social-reputation-widget'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Sparkles, Moon, Sun, Star } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Check for OnlyFans accounts via API and sync to database if found
  // This ensures accounts that completed async authentication are detected
  try {
    const apiKey = process.env.ONLYFANS_API_KEY
    if (apiKey) {
      const { createOnlyFansAPI } = await import('@/lib/onlyfans-api')
      const api = createOnlyFansAPI()
      const accountsResult = await api.listAccounts()
      
      if (accountsResult.success && accountsResult.accounts && accountsResult.accounts.length > 0) {
        const account = accountsResult.accounts[accountsResult.accounts.length - 1]
        
        // Check if we already have this connection
        const { data: existingConn } = await supabase
          .from('platform_connections')
          .select('id')
          .eq('user_id', user.id)
          .eq('platform', 'onlyfans')
          .eq('is_connected', true)
          .single()
        
        if (!existingConn) {
          // Save the connection
          const { error: insertError } = await supabase
            .from('platform_connections')
            .upsert({
              user_id: user.id,
              platform: 'onlyfans',
              platform_username: account.onlyfans_username || account.display_name || 'Connected',
              is_connected: true,
              access_token: account.id, // Store account ID here
              last_sync_at: new Date().toISOString(),
            }, { onConflict: 'user_id,platform' })
          
          if (insertError) {
            console.error('[v0] Failed to save OnlyFans connection:', insertError.message)
          }
        }
      }
    }
  } catch (e) {
    // Silent fail - continue loading dashboard
    console.error('[v0] Dashboard OnlyFans check failed:', e)
  }

  // Fetch dashboard data
  const [
    { data: fans },
    { data: content },
    { data: conversations },
    { data: leakAlerts },
    { data: mentions },
    { data: analytics },
    { data: platformConnections },
  ] = await Promise.all([
    supabase.from('fans').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('content').select('*').eq('user_id', user.id).eq('status', 'scheduled'),
    supabase.from('conversations').select('*').eq('user_id', user.id),
    supabase.from('leak_alerts').select('*').eq('user_id', user.id).eq('status', 'detected').limit(5),
    supabase.from('reputation_mentions').select('*').eq('user_id', user.id).eq('is_reviewed', false).limit(5),
    supabase.from('analytics_snapshots').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(30),
    supabase.from('platform_connections').select('*').eq('user_id', user.id).eq('is_connected', true),
  ])

  // Check if user has any connected platforms
  const hasConnectedPlatforms = (platformConnections?.length || 0) > 0

  // Calculate stats from analytics data - aggregate from both platforms
  const totalRevenue = analytics?.reduce((sum, a) => sum + (a.revenue || 0), 0) || 0
  
  // Get the latest snapshot for each platform and sum their fans
  const latestByPlatform = new Map<string, typeof analytics[0]>()
  analytics?.forEach(a => {
    if (!latestByPlatform.has(a.platform) || new Date(a.date) > new Date(latestByPlatform.get(a.platform)!.date)) {
      latestByPlatform.set(a.platform, a)
    }
  })
  const totalFans = Array.from(latestByPlatform.values()).reduce((sum, a) => sum + (a.total_fans || 0), 0) || fans?.length || 0
  const activeConversations = conversations?.length || 0
  const scheduledContent = content?.length || 0
  
  // Calculate revenue change (compare last 15 days to previous 15 days)
  const recentRevenue = analytics?.slice(0, 15).reduce((sum, a) => sum + (a.revenue || 0), 0) || 0
  const previousRevenue = analytics?.slice(15, 30).reduce((sum, a) => sum + (a.revenue || 0), 0) || 1
  const revenueChange = previousRevenue > 0 ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 : 0
  
  // Calculate new fans in last 30 days
  const newFansCount = analytics?.reduce((sum, a) => sum + (a.new_fans || 0), 0) || 0

  const stats = {
    totalRevenue,
    revenueChange: Math.round(revenueChange * 10) / 10,
    totalFans,
    fansChange: newFansCount > 0 ? Math.round((newFansCount / Math.max(totalFans, 1)) * 100 * 10) / 10 : 0,
    activeConversations,
    conversationsChange: 0,
    scheduledContent,
    contentChange: 0,
    leakAlerts: leakAlerts?.length || 0,
    mentionsToReview: mentions?.length || 0,
    hasConnectedPlatforms,
  }

  // Get current cosmic data
  const today = new Date()
  const moonPhases = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent']
  const knownNewMoon = new Date('2024-01-11')
  const lunarCycle = 29.53
  const daysSinceNew = Math.floor((today.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24))
  const daysIntoPhase = daysSinceNew % lunarCycle
  const phaseIndex = Math.floor((daysIntoPhase / lunarCycle) * 8) % 8
  const currentMoonPhase = moonPhases[phaseIndex]

  return (
    <div className="space-y-6">
      {/* Divine Assistants Quick Access */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-circe/30 bg-gradient-to-br from-circe/10 via-circe/5 to-transparent">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-circe sm:text-lg">
              <Moon className="h-4 w-4 sm:h-5 sm:w-5" />
              Circe - Retention
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Analytics & fan enchantment</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muted-foreground sm:text-sm">
              <span className="font-medium text-circe">{currentMoonPhase}</span>
            </div>
            <Button asChild variant="outline" size="sm" className="w-full border-circe/50 text-circe hover:bg-circe/20 hover:text-circe hover:border-circe sm:w-auto">
              <Link href="/dashboard/ai-studio?ai=circe">
                <Sparkles className="mr-2 h-4 w-4" />
                Consult
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-gold/30 bg-gradient-to-br from-gold/10 via-amber-500/5 to-transparent gold-glow">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-gold sm:text-lg">
              <Sun className="h-4 w-4 sm:h-5 sm:w-5" />
              Venus - Growth
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-amber-600/80 dark:text-amber-400/80">Attraction & seduction</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muted-foreground sm:text-sm">
              <span className="font-medium text-gold">Radiant</span> - Attract admirers
            </div>
            <Button asChild variant="outline" size="sm" className="w-full border-gold/50 text-gold hover:bg-gold/20 hover:text-gold hover:border-gold sm:w-auto">
              <Link href="/dashboard/ai-studio?ai=venus">
                <Star className="mr-2 h-4 w-4" />
                Consult
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Stats Overview */}
      <StatsCards stats={stats} />

      {/* Main Content Grid */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Revenue Chart - Takes 2 columns */}
        <div className="lg:col-span-2">
          <RevenueChart analytics={analytics || []} />
        </div>

        {/* Quick Actions & Platform Integration */}
        <div className="space-y-4">
          <PlatformIntegrationWidget compact />
          <QuickActions />
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Recent Fans */}
        <RecentFans fans={fans || []} />

        {/* Alerts & Mentions */}
        <AlertsWidget leakAlerts={leakAlerts || []} mentions={mentions || []} />
      </div>

      {/* Social Media Reputation */}
      <SocialReputationWidget />
    </div>
  )
}
