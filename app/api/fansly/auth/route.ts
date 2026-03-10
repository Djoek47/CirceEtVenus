import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createFanslyAPI } from '@/lib/fansly-api'

// POST: Authenticate with Fansly
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = process.env.FANSLY_API_KEY
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'Fansly API not configured. Please add FANSLY_API_KEY to environment variables.' 
      }, { status: 500 })
    }

    const body = await request.json()
    console.log('[v0] Fansly auth request body:', { 
      hasUsername: !!body.username, 
      hasPassword: !!body.password,
      has2FA: !!body.twoFactorToken,
      countryCode: body.countryCode 
    })
    
    const { username, password, twoFactorToken, twoFactorCode, countryCode = 'US' } = body

    if (!username || !password) {
      console.log('[v0] Fansly auth error: Missing credentials')
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    const api = createFanslyAPI()

    // If 2FA token and code are provided, submit 2FA
    if (twoFactorToken && twoFactorCode) {
      const result = await api.submit2FA(
        username,
        password,
        twoFactorToken,
        twoFactorCode,
        `Circe et Venus - ${user.email}`,
        countryCode
      )

      if (result.success && result.account_id) {
        // Store the connection
        await supabase
          .from('platform_connections')
          .upsert({
            user_id: user.id,
            platform: 'fansly',
            platform_user_id: result.account_id,
            platform_username: username,
            is_connected: true,
            access_token: result.account_id,
            last_sync_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,platform'
          })

        return NextResponse.json({ 
          success: true, 
          accountId: result.account_id,
          username: username
        })
      }

      return NextResponse.json({ 
        error: result.message || '2FA verification failed' 
      }, { status: 400 })
    }

    // Initial connection attempt
    console.log('[v0] Fansly attempting connection for:', username)
    const result = await api.connectAccount(username, password, countryCode)
    console.log('[v0] Fansly connection result:', { 
      success: result.success, 
      requires_2fa: result.requires_2fa,
      hasAccountId: !!result.account_id 
    })

    if (result.requires_2fa && result.twoFactorToken) {
      return NextResponse.json({
        requires_2fa: true,
        twoFactorToken: result.twoFactorToken,
        message: 'Please enter the 2FA code sent to your email/phone'
      })
    }

    if (result.success && result.account_id) {
      // Store the connection
      await supabase
        .from('platform_connections')
        .upsert({
          user_id: user.id,
          platform: 'fansly',
          platform_user_id: result.account_id,
          platform_username: username,
          is_connected: true,
          access_token: result.account_id,
          last_sync_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,platform'
        })

      return NextResponse.json({ 
        success: true, 
        accountId: result.account_id,
        username: username
      })
    }

    return NextResponse.json({ 
      error: result.message || 'Connection failed' 
    }, { status: 400 })

  } catch (error) {
    console.error('Fansly auth error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Authentication failed' },
      { status: 500 }
    )
  }
}
