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

    const api = createOnlyFansAPI(connection.access_token)

    // Fetch all data
    const [stats, earningsData, fansData, conversationsData] = await Promise.all([
      api.getStats(),
      api.getEarnings(),
      api.getFans({ status: 'all', limit: 500 }),
      api.getConversations({ limit: 100 }),
    ])

    // Store analytics snapshot
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('analytics_snapshots').upsert({
      user_id: user.id,
      platform: 'onlyfans',
      date: today,
      total_fans: stats.fans.total,
      new_fans: stats.fans.new,
      churned_fans: stats.fans.expired,
      revenue: earningsData.total,
      messages_received: conversationsData.conversations.reduce((sum, c) => sum + c.unreadCount, 0),
      messages_sent: 0,
    }, {
      onConflict: 'user_id,platform,date'
    })

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
