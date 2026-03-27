import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAppUrl } from '@/lib/site-url'

const INSTAGRAM_CLIENT_ID = process.env.INSTAGRAM_CLIENT_ID
const INSTAGRAM_CLIENT_SECRET = process.env.INSTAGRAM_CLIENT_SECRET
const INSTAGRAM_REDIRECT_URI = `${getAppUrl()}/api/instagram/callback`

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(new URL('/dashboard/settings?error=instagram_denied', request.url))
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/dashboard/settings?error=instagram_invalid', request.url))
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login?error=not_authenticated', request.url))
    }

    // Verify state
    const { data: oauthState } = await supabase
      .from('oauth_states')
      .select('state')
      .eq('user_id', user.id)
      .eq('platform', 'instagram')
      .eq('state', state)
      .single()

    if (!oauthState) {
      return NextResponse.redirect(new URL('/dashboard/settings?error=instagram_state_mismatch', request.url))
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: INSTAGRAM_CLIENT_ID!,
        client_secret: INSTAGRAM_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        redirect_uri: INSTAGRAM_REDIRECT_URI,
        code,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error('Instagram token error:', errorData)
      return NextResponse.redirect(new URL('/dashboard/settings?error=instagram_token_failed', request.url))
    }

    const tokens = await tokenResponse.json()

    // Get long-lived token
    const longLivedResponse = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${INSTAGRAM_CLIENT_SECRET}&access_token=${tokens.access_token}`
    )
    const longLivedData = await longLivedResponse.json()

    // Get user info
    const userResponse = await fetch(
      `https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${longLivedData.access_token || tokens.access_token}`
    )
    const userData = await userResponse.json()

    // Save connection
    await supabase.from('platform_connections').upsert({
      user_id: user.id,
      platform: 'instagram',
      platform_username: userData?.username || 'Connected',
      is_connected: true,
      access_token: longLivedData.access_token || tokens.access_token,
      last_sync_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform' })

    // Clean up oauth state
    await supabase.from('oauth_states').delete().eq('user_id', user.id).eq('platform', 'instagram')

    return NextResponse.redirect(new URL('/dashboard/settings?success=instagram_connected', request.url))
  } catch (error) {
    console.error('Instagram callback error:', error)
    return NextResponse.redirect(new URL('/dashboard/settings?error=instagram_callback_failed', request.url))
  }
}
