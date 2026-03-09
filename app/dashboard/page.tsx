import { createClient } from '@/lib/supabase/server'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { RecentFans } from '@/components/dashboard/recent-fans'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { AlertsWidget } from '@/components/dashboard/alerts-widget'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Sparkles, Moon, Sun, Star } from 'lucide-react'

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
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-circe/30 bg-gradient-to-br from-circe/10 via-circe/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-circe">
              <Moon className="h-5 w-5" />
              Circe - Retention Enchantress
            </CardTitle>
            <CardDescription>Analytics, retention spells, and fan enchantment</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              <span className="text-circe font-medium">{currentMoonPhase}</span> - {phaseIndex < 4 ? 'Growing energy' : 'Releasing energy'}
            </div>
            <Button asChild variant="outline" size="sm" className="border-circe/50 text-circe hover:bg-circe/10">
              <Link href="/dashboard/ai-studio?ai=circe">
                <Sparkles className="mr-2 h-4 w-4" />
                Consult Circe
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-venus/30 bg-gradient-to-br from-venus/10 via-venus/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-venus">
              <Sun className="h-5 w-5" />
              Venus - Growth Goddess
            </CardTitle>
            <CardDescription>Attraction strategies, growth magic, and seduction</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              <span className="text-venus font-medium">Radiant</span> - Perfect for attracting new admirers
            </div>
            <Button asChild variant="outline" size="sm" className="border-venus/50 text-venus hover:bg-venus/10">
              <Link href="/dashboard/ai-studio?ai=venus">
                <Star className="mr-2 h-4 w-4" />
                Consult Venus
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

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
