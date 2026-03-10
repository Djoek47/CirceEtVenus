import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createFanslyAPI } from '@/lib/fansly-api'

// GET: List all connected Fansly accounts from the API
export async function GET() {
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

    const api = createFanslyAPI()
    
    // List all accounts connected to the Fansly API key
    const result = await api.listAccounts()

    if (result.success && result.accounts.length > 0) {
      // Get profile data for each account
      const accountsWithProfiles = await Promise.all(
        result.accounts.map(async (account) => {
          try {
            const profile = await api.getProfile(account.accountId)
            return {
              ...account,
              username: profile.username,
              displayName: profile.displayName,
              avatar: profile.avatar,
              followersCount: profile.followersCount,
              subscribersCount: profile.subscribersCount,
            }
          } catch {
            return {
              ...account,
              username: account.name,
              displayName: account.name,
            }
          }
        })
      )

      return NextResponse.json({
        success: true,
        accounts: accountsWithProfiles
      })
    }

    return NextResponse.json({
      success: true,
      accounts: []
    })

  } catch (error) {
    console.error('Fansly list accounts error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list accounts' },
      { status: 500 }
    )
  }
}

// POST: Link an existing Fansly account to user's CRM profile
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
    const { username, password, twoFactorToken, twoFactorCode, countryCode = 'US' } = body

    if (!username || !password) {
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
    const result = await api.connectAccount(username, password, countryCode)

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
    
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
    
    // Handle specific API errors with user-friendly messages
    if (errorMessage.includes('Account limit reached')) {
      return NextResponse.json({
        error: 'Account limit reached on your Fansly API plan. Please upgrade at apifansly.com to connect more accounts.',
        upgradeRequired: true,
        upgradeUrl: 'https://apifansly.com/pricing'
      }, { status: 402 })
    }
    
    if (errorMessage.includes('Invalid credentials') || errorMessage.includes('incorrect')) {
      return NextResponse.json({
        error: 'Invalid Fansly username or password. Please check your credentials and try again.'
      }, { status: 401 })
    }
    
    if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
      return NextResponse.json({
        error: 'Too many requests. Please wait a moment and try again.'
      }, { status: 429 })
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
