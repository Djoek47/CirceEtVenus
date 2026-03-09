import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'

// GET: Get authorization URL for connecting OnlyFans
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || ''
    const redirectUri = `${origin}/api/onlyfans/callback`
    
    const api = createOnlyFansAPI()
    const { url } = await api.getAuthUrl(redirectUri, user.id)
    
    return NextResponse.json({ url })
  } catch (error) {
    console.error('Error getting auth URL:', error)
    return NextResponse.json(
      { error: 'Failed to get authorization URL' },
      { status: 500 }
    )
  }
}

// POST: Exchange code for account access
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code } = await request.json()
    
    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 })
    }

    const api = createOnlyFansAPI()
    const { accountId, username } = await api.exchangeCode(code)
    
    // Store the connection in the database
    const { error: dbError } = await supabase
      .from('platform_connections')
      .upsert({
        user_id: user.id,
        platform: 'onlyfans',
        platform_user_id: accountId,
        platform_username: username,
        is_connected: true,
        access_token: accountId, // Store accountId as token for API calls
        last_sync_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,platform'
      })
    
    if (dbError) {
      console.error('Error storing connection:', dbError)
      return NextResponse.json({ error: 'Failed to store connection' }, { status: 500 })
    }

    return NextResponse.json({ success: true, username })
  } catch (error) {
    console.error('Error exchanging code:', error)
    return NextResponse.json(
      { error: 'Failed to connect account' },
      { status: 500 }
    )
  }
}
