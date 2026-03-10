import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createFanslyAPI } from '@/lib/fansly-api'

// POST: Sync Fansly data for a user
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the Fansly connection
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'fansly')
      .eq('is_connected', true)
      .single()

    if (!connection || !connection.platform_user_id) {
      return NextResponse.json({ error: 'Fansly not connected' }, { status: 400 })
    }

    const api = createFanslyAPI()
    const accountId = connection.platform_user_id

    // Fetch all data from Fansly API - wrap in try/catch for each call
    let profile = { username: '', displayName: '', avatar: '', subscribersCount: 0, followersCount: 0 }
    let fans = { data: [] as any[], count: 0 }
    let earnings = { total: 0, subscriptions: 0, tips: 0, messages: 0, period: { start: '', end: '' } }
    let followers = { data: [], count: 0 }

    try {
      profile = await api.getProfile(accountId)
    } catch (e) { console.error('Failed to fetch Fansly profile:', e) }

    try {
      fans = await api.getFans(accountId, { status: 'active', limit: 500 })
    } catch (e) { console.error('Failed to fetch Fansly fans:', e) }

    try {
      earnings = await api.getEarnings(accountId)
    } catch (e) { console.error('Failed to fetch Fansly earnings:', e) }

    try {
      followers = await api.getFollowers(accountId)
    } catch (e) { console.error('Failed to fetch Fansly followers:', e) }

    // Store analytics snapshot
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('analytics_snapshots').upsert({
      user_id: user.id,
      platform: 'fansly',
      date: today,
      total_fans: fans.count || 0,
      new_fans: 0,
      churned_fans: 0,
      revenue: earnings.total || 0,
      messages_received: 0,
      messages_sent: 0,
    }, {
      onConflict: 'user_id,platform,date'
    })

    // Sync fans/subscribers
    let synced = 0
    if (fans.data && fans.data.length > 0) {
      for (const fan of fans.data) {
        const { error } = await supabase.from('fans').upsert({
          user_id: user.id,
          platform: 'fansly',
          platform_fan_id: fan.id,
          username: fan.username,
          display_name: fan.displayName || fan.username,
          avatar_url: fan.avatar,
          subscribed_at: fan.subscribedAt,
          expires_at: fan.expiresAt,
          total_spent: fan.totalSpent || 0,
          subscription_price: fan.price || 0,
          is_renewing: fan.renewing || false,
          tier: (fan.totalSpent || 0) >= 500 ? 'vip' : (fan.totalSpent || 0) >= 100 ? 'whale' : 'regular',
          last_activity_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,platform,platform_fan_id'
        })
        
        if (!error) synced++
      }
    }

    // Update platform connection with profile info
    await supabase
      .from('platform_connections')
      .update({ 
        last_sync_at: new Date().toISOString(),
        platform_username: profile.username || connection.platform_username,
      })
      .eq('id', connection.id)

    return NextResponse.json({
      success: true,
      synced: {
        fans: synced,
        totalFans: fans.count || 0,
        followers: followers.count || 0,
        revenue: earnings.total || 0,
        profile: {
          username: profile.username,
          displayName: profile.displayName,
          avatar: profile.avatar,
          subscribersCount: profile.subscribersCount,
          followersCount: profile.followersCount,
        }
      }
    })
  } catch (error) {
    console.error('Fansly sync error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync Fansly data' },
      { status: 500 }
    )
  }
}

// GET: Get Fansly sync status
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: connection } = await supabase
      .from('platform_connections')
      .select('last_sync_at, is_connected, platform_username, platform_user_id')
      .eq('user_id', user.id)
      .eq('platform', 'fansly')
      .single()

    return NextResponse.json({
      connected: connection?.is_connected || false,
      lastSync: connection?.last_sync_at || null,
      username: connection?.platform_username || null,
      accountId: connection?.platform_user_id || null,
    })
  } catch (error) {
    console.error('Fansly status error:', error)
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 })
  }
}
