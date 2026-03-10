import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'

// GET: Return the OnlyFans API console URL for manual connection
// Users connect their account in the OnlyFansAPI console, then sync from our app
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if API key is configured
    const apiKey = process.env.ONLYFANS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'OnlyFans API not configured. Please add ONLYFANS_API_KEY to environment variables.',
      }, { status: 500 })
    }

    // Return the console URL - users connect their OF account there
    return NextResponse.json({ 
      consoleUrl: 'https://app.onlyfansapi.com/accounts',
      userId: user.id,
      instructions: 'Connect your OnlyFans account in the console, then return here and sync.'
    })
  } catch (error) {
    console.error('Error in auth endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to initialize. Please try again.' },
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
