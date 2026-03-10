import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'

// POST: Direct authentication with email/password (bypasses broken SDK modal)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = process.env.ONLYFANS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'OnlyFans API not configured. Please contact support.' 
      }, { status: 500 })
    }

    const body = await request.json()
    const { email, password, attemptId, twoFactorCode, proxyCountry = 'us' } = body

    const api = createOnlyFansAPI()

    // If 2FA code provided, submit it
    if (attemptId && twoFactorCode) {
      const result = await api.submit2FA(attemptId, twoFactorCode)
      
      if (result.success && result.accountId) {
        // Save connection to database
        await supabase
          .from('platform_connections')
          .upsert({
            user_id: user.id,
            platform: 'onlyfans',
            platform_user_id: result.accountId,
            platform_username: result.username || email.split('@')[0],
            is_connected: true,
            access_token: result.accountId,
            last_sync_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,platform'
          })

        return NextResponse.json({ 
          success: true, 
          accountId: result.accountId,
          username: result.username
        })
      }

      return NextResponse.json({ error: result.message || '2FA verification failed' }, { status: 400 })
    }

    // If attemptId provided without 2FA, poll for status
    if (attemptId) {
      const status = await api.pollAuthenticationStatus(attemptId)
      
      if (status.status === '2fa_required') {
        return NextResponse.json({
          requires_2fa: true,
          attemptId,
          message: 'Please enter the 2FA code sent to your device'
        })
      }

      if (status.status === 'success' && status.accountId) {
        // Save connection
        await supabase
          .from('platform_connections')
          .upsert({
            user_id: user.id,
            platform: 'onlyfans',
            platform_user_id: status.accountId,
            platform_username: status.username || 'Connected',
            is_connected: true,
            access_token: status.accountId,
            last_sync_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,platform'
          })

        return NextResponse.json({ 
          success: true, 
          accountId: status.accountId,
          username: status.username
        })
      }

      if (status.status === 'failed') {
        return NextResponse.json({ error: status.message || 'Authentication failed' }, { status: 400 })
      }

      return NextResponse.json({ 
        status: 'pending',
        attemptId,
        message: status.message || 'Processing...'
      })
    }

    // Start new authentication
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const result = await api.startAuthentication(email, password, proxyCountry)

    if (!result.success) {
      return NextResponse.json({ error: result.message || 'Failed to start authentication' }, { status: 400 })
    }

    return NextResponse.json({
      attemptId: result.attempt_id,
      polling_url: result.polling_url,
      message: result.message || 'Authentication started. Please wait...'
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// GET: Create a client session token for the @onlyfansapi/auth package (legacy)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = process.env.ONLYFANS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'OnlyFans API not configured. Please add ONLYFANS_API_KEY.' 
      }, { status: 500 })
    }

    // Create a client session token via OnlyFans API
    const response = await fetch('https://app.onlyfansapi.com/api/client-sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        display_name: `Circe et Venus - ${user.email}`,
        client_reference_id: user.id,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OnlyFans API error:', errorData)
      return NextResponse.json({ 
        error: 'Failed to create authentication session' 
      }, { status: 500 })
    }

    const data = await response.json()
    
    // Return the client session token (starts with ofapi_cs_)
    return NextResponse.json({ 
      token: data.data?.token || data.token,
      userId: user.id
    })
  } catch (error) {
    console.error('Error creating client session:', error)
    return NextResponse.json(
      { error: 'Failed to initialize authentication' },
      { status: 500 }
    )
  }
}
