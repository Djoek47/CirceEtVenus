import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAppUrl } from '@/lib/site-url'

const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET
const TIKTOK_REDIRECT_URI = `${getAppUrl()}/api/tiktok/callback`

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(new URL('/dashboard/settings?error=tiktok_denied', request.url))
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/dashboard/settings?error=tiktok_invalid', request.url))
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login?error=not_authenticated', request.url))
    }

    // Get stored state and code_verifier
    const { data: oauthState } = await supabase
      .from('oauth_states')
      .select('code_verifier')
      .eq('user_id', user.id)
      .eq('platform', 'tiktok')
      .eq('state', state)
      .single()

    if (!oauthState) {
      return NextResponse.redirect(new URL('/dashboard/settings?error=tiktok_state_mismatch', request.url))
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_key: TIKTOK_CLIENT_KEY!,
        client_secret: TIKTOK_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: TIKTOK_REDIRECT_URI,
        code_verifier: oauthState.code_verifier || '',
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error('TikTok token error:', errorData)
      return NextResponse.redirect(new URL('/dashboard/settings?error=tiktok_token_failed', request.url))
    }

    const tokens = await tokenResponse.json()

    // Get user info
    const userResponse = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    })

    const userData = await userResponse.json()
    const tiktokUser = userData.data?.user

    // Save connection
    await supabase.from('platform_connections').upsert({
      user_id: user.id,
      platform: 'tiktok',
      platform_username: tiktokUser?.display_name || 'Connected',
      is_connected: true,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      last_sync_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform' })

    // Clean up oauth state
    await supabase.from('oauth_states').delete().eq('user_id', user.id).eq('platform', 'tiktok')

    return NextResponse.redirect(new URL('/dashboard/settings?success=tiktok_connected', request.url))
  } catch (error) {
    console.error('TikTok callback error:', error)
    return NextResponse.redirect(new URL('/dashboard/settings?error=tiktok_callback_failed', request.url))
  }
}
