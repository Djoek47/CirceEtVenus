import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'
import { assertPlatformAccountAvailable } from '@/lib/platform-connections'

// POST: Handle callback from @onlyfansapi/auth SDK
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accountId, account_id, username, clientReferenceId, client_reference_id } = body
    
    const finalAccountId = accountId || account_id
    const finalUserId = clientReferenceId || client_reference_id

    if (!finalAccountId) {
      return NextResponse.json({ error: 'No account ID provided' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Get user ID from the reference or current session
    let userId = finalUserId
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id
    }

    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    const ownership = await assertPlatformAccountAvailable(supabase as any, {
      platform: 'onlyfans',
      externalAccountId: finalAccountId,
      currentUserId: userId,
    })
    if (!ownership.ok && ownership.ownedByOtherUser) {
      return NextResponse.json(
        { error: 'This OnlyFans account is already connected to another Circe et Venus workspace.', code: 'ONLYFANS_ACCOUNT_ALREADY_CONNECTED' },
        { status: 409 }
      )
    }

    // Save the connection
    const { error: dbError } = await supabase
      .from('platform_connections')
      .upsert({
        user_id: userId,
        platform: 'onlyfans',
        platform_user_id: finalAccountId,
        platform_username: username || 'Connected',
        is_connected: true,
        access_token: finalAccountId,
        last_sync_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,platform'
      })

    if (dbError) {
      if (dbError.code === '23505') {
        return NextResponse.json(
          { error: 'This OnlyFans account is already connected to another Circe et Venus workspace.', code: 'ONLYFANS_ACCOUNT_ALREADY_CONNECTED' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: 'Failed to save connection' }, { status: 500 })
    }

    // Trigger sync
    await syncOnlyFansData(userId, finalAccountId)

    return NextResponse.json({ 
      success: true,
      accountId: finalAccountId,
      username
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Callback failed' },
      { status: 500 }
    )
  }
}

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
      if (dbError.code === '23505') {
        return NextResponse.redirect(
          `${baseUrl}/dashboard/settings?tab=integrations&error=ONLYFANS_ACCOUNT_ALREADY_CONNECTED`
        )
      }
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
