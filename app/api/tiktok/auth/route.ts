import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

// TikTok Login Kit
const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY
const TIKTOK_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/tiktok/callback`
  : 'http://localhost:3000/api/tiktok/callback'

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

    if (!TIKTOK_CLIENT_KEY) {
      return NextResponse.json({ 
        error: 'TikTok integration not configured. Please add TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET.' 
      }, { status: 500 })
    }

    // Generate PKCE values
    const { codeVerifier, codeChallenge } = generatePKCE()
    
    // Generate state for CSRF protection
    const state = crypto.randomBytes(16).toString('hex')
    
    // Store state and code_verifier in database for callback verification
    await supabase.from('oauth_states').upsert({
      user_id: user.id,
      platform: 'tiktok',
      state,
      code_verifier: codeVerifier,
      created_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform' })

    // Build authorization URL
    const authUrl = new URL('https://www.tiktok.com/v2/auth/authorize/')
    authUrl.searchParams.set('client_key', TIKTOK_CLIENT_KEY)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', 'user.info.basic,video.list')
    authUrl.searchParams.set('redirect_uri', TIKTOK_REDIRECT_URI)
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('code_challenge', codeChallenge)
    authUrl.searchParams.set('code_challenge_method', 'S256')

    return NextResponse.json({ authUrl: authUrl.toString() })
  } catch (error) {
    console.error('TikTok auth error:', error)
    return NextResponse.json({ error: 'Failed to initiate TikTok auth' }, { status: 500 })
  }
}
