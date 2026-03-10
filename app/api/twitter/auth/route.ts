import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

// Twitter OAuth 2.0 with PKCE
const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET
const TWITTER_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/twitter/callback`
  : 'http://localhost:3000/api/twitter/callback'

// Generate PKCE code verifier and challenge
function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')
  return { codeVerifier, codeChallenge }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    if (!TWITTER_CLIENT_ID) {
      return NextResponse.json({ 
        error: 'Twitter integration not configured. Please add TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET.' 
      }, { status: 500 })
    }

    // Generate PKCE values
    const { codeVerifier, codeChallenge } = generatePKCE()
    
    // Store code verifier in session/cookie for callback
    const state = crypto.randomBytes(16).toString('hex')
    
    // Store state and code_verifier in database for callback verification
    await supabase.from('oauth_states').upsert({
      user_id: user.id,
      platform: 'twitter',
      state,
      code_verifier: codeVerifier,
      created_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform' })

    // Build authorization URL
    const authUrl = new URL('https://twitter.com/i/oauth2/authorize')
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('client_id', TWITTER_CLIENT_ID)
    authUrl.searchParams.set('redirect_uri', TWITTER_REDIRECT_URI)
    authUrl.searchParams.set('scope', 'tweet.read users.read follows.read offline.access')
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('code_challenge', codeChallenge)
    authUrl.searchParams.set('code_challenge_method', 'S256')

    return NextResponse.json({ authUrl: authUrl.toString() })
  } catch (error) {
    console.error('Twitter auth error:', error)
    return NextResponse.json({ error: 'Failed to initiate Twitter auth' }, { status: 500 })
  }
}
