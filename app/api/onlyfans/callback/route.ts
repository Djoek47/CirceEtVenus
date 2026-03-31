import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'
import { assertPlatformAccountAvailable } from '@/lib/platform-connections'

/**
 * OnlyFans connection callback (SDK flow).
 * POST: Called by frontend after @onlyfansapi/auth succeeds. Body: accountId, username?, clientReferenceId?.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const accountId = body.accountId ?? body.account_id
    const username = body.username
    const clientReferenceId = body.clientReferenceId ?? body.client_reference_id

    if (!accountId) {
      return NextResponse.json({ error: 'No account ID provided' }, { status: 400 })
    }

    const supabase = await createRouteHandlerClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    // Always use the current session user so connection and analytics are saved to the logged-in account
    const userId = user?.id ?? clientReferenceId
    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }
    if (clientReferenceId && clientReferenceId !== userId) {
      return NextResponse.json(
        { error: 'Session mismatch. Please refresh and try again.' },
        { status: 403 }
      )
    }

    const ownership = await assertPlatformAccountAvailable(supabase as any, {
      platform: 'onlyfans',
      externalAccountId: accountId,
      currentUserId: userId,
    })
    if (!ownership.ok && ownership.ownedByOtherUser) {
      return NextResponse.json(
        {
          error: 'This OnlyFans account is already connected to another Circe et Venus workspace.',
          code: 'ONLYFANS_ACCOUNT_ALREADY_CONNECTED',
        },
        { status: 409 }
      )
    }

    const { error: dbError } = await supabase
      .from('platform_connections')
      .upsert({
        user_id: userId,
        platform: 'onlyfans',
        platform_username: username || 'Connected',
        is_connected: true,
        access_token: accountId,
        last_sync_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,platform',
      })

    if (dbError) {
      if (dbError.code === '23505') {
        return NextResponse.json(
          {
            error: 'This OnlyFans account is already connected to another Circe et Venus workspace.',
            code: 'ONLYFANS_ACCOUNT_ALREADY_CONNECTED',
          },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: 'Failed to save connection' }, { status: 500 })
    }

    await syncOnlyFansData(userId, accountId)

    return NextResponse.json({
      success: true,
      accountId,
      username: username || 'Connected',
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Callback failed' },
      { status: 500 }
    )
  }
}

/**
 * GET: OnlyFans uses SDK only (no OAuth redirect). Redirect to settings with a hint.
 */
export async function GET(request: NextRequest) {
  const baseUrl = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || ''
  const error = request.nextUrl.searchParams.get('error')
  const url = `${baseUrl}/dashboard/settings?tab=integrations${error ? `&error=${encodeURIComponent(error)}` : ''}`
  return NextResponse.redirect(url)
}

async function syncOnlyFansData(userId: string, accountId: string) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const api = createOnlyFansAPI(accountId)

    const [stats, earningsResult, fansResult] = await Promise.all([
      api.getStats().catch(() => null),
      api.getEarnings().catch(() => null),
      api.getFans({ status: 'active', limit: 100, sort: 'recent' }).catch(() => ({ fans: [], total: 0 })),
    ])

    const today = new Date().toISOString().split('T')[0]
    await supabase.from('analytics_snapshots').upsert(
      {
        user_id: userId,
        platform: 'onlyfans',
        date: today,
        total_fans: stats?.fans?.total ?? 0,
        new_fans: stats?.fans?.new ?? 0,
        churned_fans: stats?.fans?.expired ?? 0,
        revenue: earningsResult?.total ?? 0,
        messages_received: 0,
        messages_sent: 0,
      },
      { onConflict: 'user_id,date,platform' }
    )

    const fans = fansResult.fans ?? []
    for (const fan of fans) {
      const tier = fan.totalSpent >= 500 ? 'vip' : fan.totalSpent >= 100 ? 'whale' : 'regular'
      await supabase.from('fans').upsert(
        {
          user_id: userId,
          platform: 'onlyfans',
          platform_fan_id: fan.id,
          username: fan.username,
          display_name: fan.name,
          avatar_url: fan.avatar || null,
          subscription_tier: tier,
          total_spent: fan.totalSpent,
          first_subscribed_at: fan.subscribedAt || null,
          last_interaction_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,platform,platform_fan_id' }
      )
    }
  } catch (err) {
    console.error('OnlyFans callback sync error:', err)
  }
}
