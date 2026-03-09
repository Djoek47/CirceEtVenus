import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state') // This is the user_id we passed
  const error = searchParams.get('error')

  const baseUrl = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || ''

  if (error) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/settings?tab=integrations&error=${encodeURIComponent(error)}`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/settings?tab=integrations&error=missing_params`
    )
  }

  try {
    const supabase = await createClient()
    
    // Exchange the code for account access
    const api = createOnlyFansAPI()
    const { accountId, username } = await api.exchangeCode(code)
    
    // Store the connection
    const { error: dbError } = await supabase
      .from('platform_connections')
      .upsert({
        user_id: state, // The user ID from the state parameter
        platform: 'onlyfans',
        platform_user_id: accountId,
        platform_username: username,
        is_connected: true,
        access_token: accountId,
        last_sync_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,platform'
      })

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.redirect(
        `${baseUrl}/dashboard/settings?tab=integrations&error=db_error`
      )
    }

    // Trigger initial data sync
    await syncOnlyFansData(state, accountId)

    return NextResponse.redirect(
      `${baseUrl}/dashboard/settings?tab=integrations&success=onlyfans_connected`
    )
  } catch (err) {
    console.error('Callback error:', err)
    return NextResponse.redirect(
      `${baseUrl}/dashboard/settings?tab=integrations&error=connection_failed`
    )
  }
}

// Initial sync of OnlyFans data
async function syncOnlyFansData(userId: string, accountId: string) {
  try {
    const supabase = await createClient()
    const api = createOnlyFansAPI(accountId)

    // Fetch stats
    const stats = await api.getStats()
    
    // Fetch recent fans
    const { fans } = await api.getFans({ status: 'active', limit: 100, sort: 'recent' })
    
    // Fetch earnings
    const earnings = await api.getEarnings()

    // Store analytics snapshot
    await supabase.from('analytics_snapshots').insert({
      user_id: userId,
      platform: 'onlyfans',
      date: new Date().toISOString().split('T')[0],
      total_fans: stats.fans.total,
      new_fans: stats.fans.new,
      churned_fans: stats.fans.expired,
      revenue: earnings.total,
      messages_received: 0, // Will be updated via webhooks
      messages_sent: 0,
    })

    // Store fans data
    for (const fan of fans) {
      await supabase.from('fans').upsert({
        user_id: userId,
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
      }, {
        onConflict: 'user_id,platform,platform_fan_id'
      })
    }

    console.log(`Synced ${fans.length} fans for user ${userId}`)
  } catch (error) {
    console.error('Sync error:', error)
  }
}
