import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'

// POST: Manually trigger sync of OnlyFans data
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: connection } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'onlyfans')
      .eq('is_connected', true)
      .single()

    if (!connection?.access_token) {
      return NextResponse.json(
        { error: 'No OnlyFans account connected. Please connect your account first.' },
        { status: 400 }
      )
    }

    const api = createOnlyFansAPI()
    api.setAccountId(connection.access_token)

    const accountsResult = await api.listAccounts()
    const accountData = accountsResult.accounts?.find((a) => a.id === connection.access_token)
    const userData = (accountData as any)?.onlyfans_user_data || {}

    let stats = { fans: { total: 0, active: 0, expired: 0, new: 0 }, earnings: { today: 0, thisWeek: 0, thisMonth: 0, total: 0 }, content: { posts: 0, photos: 0, videos: 0 } }
    let earningsData = { total: 0, subscriptions: 0, tips: 0, messages: 0, posts: 0, streams: 0, referrals: 0, period: { start: '', end: '' } }
    let fansData = { fans: [] as any[], total: 0 }
    let conversationsData = { conversations: [] as any[] }
    let chartData = { data: [] as any[] }
    let accountProfile: any = null

    try {
      const [statsRes, earningsRes, fansRes, convoRes, chartRes, accountRes] = await Promise.all([
        api.getStats().catch((e) => { console.log('OnlyFans sync Stats error:', e.message); return null }),
        api.getEarnings().catch((e) => { console.log('OnlyFans sync Earnings error:', e.message); return null }),
        api.getFans({ status: 'all', limit: 500 }).catch((e) => { console.log('OnlyFans sync Fans error:', e.message); return null }),
        api.getConversations({ limit: 100 }).catch((e) => { console.log('OnlyFans sync Conversations error:', e.message); return null }),
        api.getEarningsChart({ days: 30 }).catch((e) => { console.log('OnlyFans sync Chart error:', e.message); return null }),
        api.getAccount().catch((e) => { console.log('OnlyFans sync Account error:', e.message); return null }),
      ])
      
      if (statsRes) stats = statsRes
      if (earningsRes) earningsData = earningsRes
      if (fansRes) fansData = fansRes
      if (convoRes) conversationsData = convoRes
      if (chartRes) chartData = chartRes
      if (accountRes) accountProfile = accountRes as any
    } catch (e) {
      console.log('OnlyFans sync Sync - API fetch error:', e)
      // API fetch failed, will use userData fallback
    }

    // Extract data from userData if API calls returned empty
    // subscribersCount = fans who subscribe to you (what we want)
    // subscribesCount = accounts you subscribe to (not what we want)
    if (stats.fans.total === 0 && userData.subscribersCount !== undefined) {
      stats.fans.total = userData.subscribersCount || 0
      stats.fans.active = userData.subscribersCount || 0
    }
    if (stats.content.posts === 0 && userData.postsCount) {
      stats.content.posts = userData.postsCount || 0
      stats.content.photos = userData.photosCount || 0
      stats.content.videos = userData.videosCount || 0
    }


    // Store today's analytics snapshot
    const today = new Date().toISOString().split('T')[0]
    
    // Delete existing entry for today first
    await supabase.from('analytics_snapshots')
      .delete()
      .eq('user_id', user.id)
      .eq('platform', 'onlyfans')
      .eq('date', today)
    
    // Calculate message stats from conversations
    const conversations = conversationsData.conversations || []
    const unreadMessages = conversations.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0)
    const totalConversations = conversations.length

    // Prefer fans total from the most reliable source available
    const totalFans =
      stats.fans.total ||
      fansData.total ||
      (Array.isArray(fansData.fans) ? fansData.fans.length : 0) ||
      accountProfile?.subscribersCount ||
      accountProfile?.fansCount ||
      userData.subscribersCount ||
      0

    // Prefer revenue from chart (today) if available, else earnings endpoint, else stats
    const todayPoint = (chartData.data || []).find((p: any) => p.date === today)
    const revenueToday =
      (todayPoint?.amount ?? 0) ||
      (stats.earnings?.today ?? 0) ||
      (earningsData?.today ?? 0) ||
      (earningsData?.thisDay ?? 0) ||
      0

    const revenueFallbackTotal =
      (earningsData?.thisMonth ?? 0) ||
      (earningsData?.total ?? 0) ||
      (stats.earnings?.thisMonth ?? 0) ||
      0
    
    // Use total conversations as a proxy for message activity
    // messages_received = unread count (new messages waiting)
    // messages_sent = total active conversations (as we can send to all of them)
    const snapshotData = {
      user_id: user.id,
      platform: 'onlyfans',
      date: today,
      total_fans: totalFans,
      new_fans: stats.fans.new || 0,
      churned_fans: stats.fans.expired || 0,
      revenue: revenueToday || revenueFallbackTotal,
      messages_received: unreadMessages,
      messages_sent: totalConversations,
    }
    
    const { error: snapshotError } = await supabase.from('analytics_snapshots').insert(snapshotData)
    if (snapshotError) console.error('OnlyFans sync snapshot error:', snapshotError.message)

    // Store historical chart data (last 30 days) - skip if no data
    if (chartData.data && chartData.data.length > 0) {
      // Delete existing chart data for this platform first
      await supabase.from('analytics_snapshots')
        .delete()
        .eq('user_id', user.id)
        .eq('platform', 'onlyfans')
        .neq('date', today)
      
      const chartSnapshots = chartData.data
        .filter((point: any) => point.date !== today)
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

    let synced = 0
    for (const fan of fansData.fans) {
      const tier = fan.totalSpent >= 500 ? 'vip' : fan.totalSpent >= 100 ? 'whale' : 'regular'
      const { error } = await supabase.from('fans').upsert(
        {
        user_id: user.id,
        platform: 'onlyfans',
        platform_fan_id: fan.id,
        username: fan.username,
        display_name: fan.name,
          avatar_url: fan.avatar || null,
          first_subscribed_at: fan.subscribedAt || null,
        total_spent: fan.totalSpent,
          subscription_tier: tier,
        last_interaction_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,platform,platform_fan_id' }
      )
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
    const message = error instanceof Error ? error.message : 'Failed to sync data'

    // If the upstream OnlyFans session is expired, auto-disconnect and tell the user to reconnect
    if (message.includes('ONLYFANS_SESSION_EXPIRED')) {
      try {
        const supabase = await createRouteHandlerClient(request)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase
            .from('platform_connections')
            .update({ is_connected: false, access_token: null })
            .eq('user_id', user.id)
            .eq('platform', 'onlyfans')
        }
      } catch {
        // best-effort; still return 401
      }
      return NextResponse.json(
        {
          error: 'OnlyFans session expired',
          code: 'ONLYFANS_SESSION_EXPIRED',
          message:
            'Your OnlyFans session with our data partner expired. Please reconnect OnlyFans from your dashboard, then try syncing again.',
        },
        { status: 401 }
      )
    }

    console.error('OnlyFans sync error:', error)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

// GET: Get sync status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
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
