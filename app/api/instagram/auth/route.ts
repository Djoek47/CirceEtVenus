import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import { getAppUrl } from '@/lib/site-url'

// Instagram Basic Display API / Facebook Login
const INSTAGRAM_CLIENT_ID = process.env.INSTAGRAM_CLIENT_ID
const INSTAGRAM_REDIRECT_URI = `${getAppUrl()}/api/instagram/callback`

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    if (!INSTAGRAM_CLIENT_ID) {
      return NextResponse.json({ 
        error: 'Instagram integration not configured. Please add INSTAGRAM_CLIENT_ID and INSTAGRAM_CLIENT_SECRET.' 
      }, { status: 500 })
    }

    // Generate state for CSRF protection
    const state = crypto.randomBytes(16).toString('hex')
    
    // Store state in database for callback verification
    await supabase.from('oauth_states').upsert({
      user_id: user.id,
      platform: 'instagram',
      state,
      created_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform' })

    // Build authorization URL (Instagram Basic Display API)
    const authUrl = new URL('https://api.instagram.com/oauth/authorize')
    authUrl.searchParams.set('client_id', INSTAGRAM_CLIENT_ID)
    authUrl.searchParams.set('redirect_uri', INSTAGRAM_REDIRECT_URI)
    authUrl.searchParams.set('scope', 'user_profile,user_media')
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('state', state)

    return NextResponse.json({ authUrl: authUrl.toString() })
  } catch (error) {
    console.error('Instagram auth error:', error)
    return NextResponse.json({ error: 'Failed to initiate Instagram auth' }, { status: 500 })
  }
}
