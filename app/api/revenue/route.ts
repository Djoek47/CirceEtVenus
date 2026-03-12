import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'

// GET: Fetch revenue data from all connected platform APIs
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all connected platforms
    const { data: connections } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_connected', true)

    const result = {
      stats: {
        totalRevenue: 0,
        revenueChange: 0,
        totalFans: 0,
        fansChange: 0,
        earnings: {
          today: 0,
          thisWeek: 0,
          thisMonth: 0,
          total: 0,
        },
        breakdown: {
          subscriptions: 0,
          tips: 0,
          messages: 0,
          posts: 0,
        }
      },
      chartData: [] as { date: string; revenue: number; platform: string }[],
      platforms: {} as Record<string, { revenue: number; fans: number; username: string }>,
    }

    if (!connections || connections.length === 0) {
      return NextResponse.json(result)
    }

    // Fetch data from each connected platform
    for (const connection of connections) {
      if (connection.platform === 'onlyfans') {
        try {
          const accountId = connection.access_token
          if (!accountId) continue
          const api = createOnlyFansAPI(accountId)
          
          // Fetch earnings
          const earnings = await api.getEarnings()
          
          result.stats.totalRevenue += earnings.total || 0
          result.stats.breakdown.subscriptions += earnings.subscriptions || 0
          result.stats.breakdown.tips += earnings.tips || 0
          result.stats.breakdown.messages += earnings.messages || 0
          result.stats.breakdown.posts += earnings.posts || 0

          // Fetch stats (fans count)
          const stats = await api.getStats()
          
          result.stats.totalFans += stats.fans?.total || 0
          result.stats.earnings.today += stats.earnings?.today || 0
          result.stats.earnings.thisWeek += stats.earnings?.thisWeek || 0
          result.stats.earnings.thisMonth += stats.earnings?.thisMonth || 0
          result.stats.earnings.total += stats.earnings?.total || 0

          // Fetch chart data (last 30 days)
          const chartResponse = await api.getEarningsChart({ days: 30 })
          
          if (chartResponse.data) {
            chartResponse.data.forEach((point) => {
              result.chartData.push({
                date: point.date,
                revenue: point.amount,
                platform: 'onlyfans',
              })
            })
          }

          // Store platform-specific data
          result.platforms['onlyfans'] = {
            revenue: earnings.total || 0,
            fans: stats.fans?.total || 0,
            username: connection.platform_username || '',
          }

          // Update the connection with latest sync
          await supabase
            .from('platform_connections')
            .update({ last_sync_at: new Date().toISOString() })
            .eq('id', connection.id)

        } catch (error) {
          console.error('OnlyFans API error:', error)
          // Continue with other platforms even if one fails
        }
      }

      // Add Fansly data fetch here when available
      if (connection.platform === 'fansly') {
        // Fansly integration can be added similarly when API is available
        result.platforms['fansly'] = {
          revenue: 0,
          fans: 0,
          username: connection.platform_username || '',
        }
      }
    }

    // Revenue change: this month vs last month from analytics_snapshots, or this month vs long-term average
    const now = new Date()
    const thisMonthPrefix = now.toISOString().slice(0, 7)
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthPrefix = lastMonthDate.toISOString().slice(0, 7)
    const { data: snapshots } = await supabase
      .from('analytics_snapshots')
      .select('date, revenue')
      .eq('user_id', user.id)
      .or(`date.like.${thisMonthPrefix}%,date.like.${lastMonthPrefix}%`)
    let revThisMonth = 0
    let revLastMonth = 0
    for (const s of snapshots || []) {
      if (s.date?.startsWith(thisMonthPrefix)) revThisMonth += Number(s.revenue ?? 0)
      if (s.date?.startsWith(lastMonthPrefix)) revLastMonth += Number(s.revenue ?? 0)
    }
    if (revLastMonth > 0) {
      result.stats.revenueChange = Math.round(((revThisMonth - revLastMonth) / revLastMonth) * 100)
    } else if (result.stats.earnings.thisMonth > 0 && result.stats.earnings.total > 0) {
      const avgMonthly = result.stats.earnings.total / 12
      result.stats.revenueChange = Math.round(((result.stats.earnings.thisMonth - avgMonthly) / avgMonthly) * 100)
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Revenue fetch error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch revenue' 
    }, { status: 500 })
  }
}
