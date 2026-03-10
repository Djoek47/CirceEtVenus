import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET
const TWITTER_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/twitter/callback`
  : 'http://localhost:3000/api/twitter/callback'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(new URL('/dashboard/settings?error=twitter_denied', request.url))
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/dashboard/settings?error=twitter_invalid', request.url))
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
      .eq('platform', 'twitter')
      .eq('state', state)
      .single()

    if (!oauthState) {
      return NextResponse.redirect(new URL('/dashboard/settings?error=twitter_state_mismatch', request.url))
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: TWITTER_REDIRECT_URI,
        code_verifier: oauthState.code_verifier,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error('Twitter token error:', errorData)
      return NextResponse.redirect(new URL('/dashboard/settings?error=twitter_token_failed', request.url))
    }

    const tokens = await tokenResponse.json()

    // Get user info
    const userResponse = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url,public_metrics', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    })

    const userData = await userResponse.json()
    const twitterUser = userData.data

    // Save connection
    await supabase.from('platform_connections').upsert({
      user_id: user.id,
      platform: 'twitter',
      platform_username: twitterUser?.username || 'Connected',
      is_connected: true,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      last_sync_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform' })

    // Clean up oauth state
    await supabase.from('oauth_states').delete().eq('user_id', user.id).eq('platform', 'twitter')

    return NextResponse.redirect(new URL('/dashboard/settings?success=twitter_connected', request.url))
  } catch (error) {
    console.error('Twitter callback error:', error)
    return NextResponse.redirect(new URL('/dashboard/settings?error=twitter_callback_failed', request.url))
  }
}
