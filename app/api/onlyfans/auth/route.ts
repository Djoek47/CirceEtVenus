import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'

// GET: Create a client session for embedded auth widget
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const api = createOnlyFansAPI()
    
    // Create a client session for the embedded auth component
    const session = await api.createClientSession(`Circe et Venus - ${user.email}`)
    
    return NextResponse.json({ 
      token: session.token,
      // URL for manual auth flow (alternative)
      manualAuthUrl: 'https://app.onlyfansapi.com/connect'
    })
  } catch (error) {
    console.error('Error creating client session:', error)
    return NextResponse.json(
      { error: 'Failed to create authentication session' },
      { status: 500 }
    )
  }
}

// POST: Start authentication with credentials
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email, password, authId, code } = await request.json()
    
    const api = createOnlyFansAPI()
    
    // If authId is provided, we're submitting 2FA or polling
    if (authId) {
      if (code) {
        // Submit 2FA code
        const result = await api.submit2FA(authId, code)
        
        if (result.account_id) {
          // Store the connection
          await storeConnection(supabase, user.id, result.account_id)
          return NextResponse.json({ success: true, accountId: result.account_id })
        }
        
        return NextResponse.json({ status: result.status })
      } else {
        // Poll status
        const status = await api.pollAuthStatus(authId)
        
        if (status.status === 'completed' && status.account_id) {
          await storeConnection(supabase, user.id, status.account_id)
          return NextResponse.json({ success: true, accountId: status.account_id })
        }
        
        return NextResponse.json(status)
      }
    }
    
    // Start new authentication
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const result = await api.startAuthentication(email, password)
    
    return NextResponse.json({ 
      authId: result.auth_id,
      pollingUrl: result.polling_url,
      message: result.message
    })
  } catch (error) {
    console.error('Error in authentication:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}

// Helper function to store connection
async function storeConnection(
  supabase: Awaited<ReturnType<typeof createClient>>, 
  userId: string, 
  accountId: string
) {
  const { error: dbError } = await supabase
    .from('platform_connections')
    .upsert({
      user_id: userId,
      platform: 'onlyfans',
      platform_user_id: accountId,
      is_connected: true,
      access_token: accountId,
      last_sync_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,platform'
    })
  
  if (dbError) {
    console.error('Error storing connection:', dbError)
    throw new Error('Failed to store connection')
  }
}
