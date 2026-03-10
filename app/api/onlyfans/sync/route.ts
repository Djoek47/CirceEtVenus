import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'

// POST: Manually trigger sync of OnlyFans data
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the OnlyFans connection
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'onlyfans')
      .eq('is_connected', true)
      .single()

    if (!connection) {
      return NextResponse.json({ error: 'OnlyFans not connected' }, { status: 400 })
    }

    const api = createOnlyFansAPI()
    // Set the account ID for API requests
    api.setAccountId(connection.access_token)

    // First, try to get account data from listAccounts (which includes onlyfans_user_data)
    const accountsResult = await api.listAccounts()
    const accountData = accountsResult.accounts?.find(a => a.id === connection.access_token)
    const userData = (accountData as any)?.onlyfans_user_data || {}



    // Try to fetch detailed data, fall back to userData from listAccounts
    let stats = { fans: { total: 0, active: 0, expired: 0, new: 0 }, earnings: { today: 0, thisWeek: 0, thisMonth: 0, total: 0 }, content: { posts: 0, photos: 0, videos: 0 } }
    let earningsData = { total: 0, subscriptions: 0, tips: 0, messages: 0, posts: 0, streams: 0, referrals: 0, period: { start: '', end: '' } }
    let fansData = { fans: [] as any[], total: 0 }
    let conversationsData = { conversations: [] as any[] }
    let chartData = { data: [] as any[] }

    try {
      const [statsRes, earningsRes, fansRes, convoRes, chartRes] = await Promise.all([
        api.getStats().catch(() => null),
        api.getEarnings().catch(() => null),
        api.getFans({ status: 'all', limit: 500 }).catch(() => null),
        api.getConversations({ limit: 100 }).catch(() => null),
        api.getEarningsChart({ days: 30 }).catch(() => null),
      ])
      
      if (statsRes) stats = statsRes
      if (earningsRes) earningsData = earningsRes
      if (fansRes) fansData = fansRes
      if (convoRes) conversationsData = convoRes
      if (chartRes) chartData = chartRes
      
    } catch {
      // API fetch failed, will use userData fallback
    }

    // Extract data from userData if API calls returned empty
    if (stats.fans.total === 0 && userData.subscribesCount) {
      stats.fans.total = userData.subscribesCount || 0
      stats.fans.active = userData.subscribesCount || 0
    }
    if (stats.content.posts === 0 && userData.postsCount) {
      stats.content.posts = userData.postsCount || 0
      stats.content.photos = userData.photosCount || 0
      stats.content.videos = userData.videosCount || 0
    }

    // Store today's analytics snapshot
    // Delete existing entry for today first, then insert (no unique constraint for upsert)
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('analytics_snapshots')
      .delete()
      .eq('user_id', user.id)
      .eq('platform', 'onlyfans')
      .eq('date', today)
    
    const { error: snapshotError } = await supabase.from('analytics_snapshots').insert({
      user_id: user.id,
      platform: 'onlyfans',
      date: today,
      total_fans: stats.fans.total,
      new_fans: stats.fans.new || 0,
      churned_fans: stats.fans.expired || 0,
      revenue: stats.earnings?.today || earningsData.total || 0,
      messages_received: conversationsData.conversations?.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0) || 0,
      messages_sent: 0,
    })
    


    // Store historical chart data (last 30 days) - skip if no data
    if (chartData.data && chartData.data.length > 0) {
      // Delete existing chart data for this platform first
      await supabase.from('analytics_snapshots')
        .delete()
        .eq('user_id', user.id)
        .eq('platform', 'onlyfans')
        .neq('date', today) // Don't delete today's data we just inserted
      
      const chartSnapshots = chartData.data
        .filter((point: any) => point.date !== today) // Skip today since we already inserted it
        .map((point: any) => ({
          user_id: user.id,
          platform: 'onlyfans',
          date: point.date,
          revenue: point.amount || 0,
          total_fans: stats.fans.total,
          new_fans: 0,
          churned_fans: 0,
          messages_received: 0,
          messages_sent: 0,
        }))

      if (chartSnapshots.length > 0) {
        await supabase.from('analytics_snapshots').insert(chartSnapshots)
      }
    }

    // Sync fans
    let synced = 0
    for (const fan of fansData.fans) {
      const { error } = await supabase.from('fans').upsert({
        user_id: user.id,
        platform: 'onlyfans',
        platform_fan_id: fan.id,
        username: fan.username,
        display_name: fan.name,
        avatar_url: fan.avatar,
        subscribed_at: fan.subscribedAt,
        expires_at: fan.expiresAt,
        total_spent: fan.totalSpent,
        subscription_price: fan.subscriptionPrice,
        is_renewing: fan.isRenewOn,
        tier: fan.totalSpent >= 500 ? 'vip' : fan.totalSpent >= 100 ? 'whale' : 'regular',
        last_activity_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,platform,platform_fan_id'
      })
      
      if (!error) synced++
    }

    // Update last sync time
    await supabase
      .from('platform_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', connection.id)

    return NextResponse.json({
      success: true,
      synced: {
        fans: synced,
        totalFans: stats.fans.total,
        activeFans: stats.fans.active,
        revenue: earningsData.total,
      }
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync data' },
      { status: 500 }
    )
  }
}

// GET: Get sync status
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: connection } = await supabase
      .from('platform_connections')
      .select('last_sync_at, is_connected')
      .eq('user_id', user.id)
      .eq('platform', 'onlyfans')
      .single()

    return NextResponse.json({
      connected: connection?.is_connected || false,
      lastSync: connection?.last_sync_at || null,
    })
  } catch (error) {
    console.error('Status error:', error)
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 })
  }
}
