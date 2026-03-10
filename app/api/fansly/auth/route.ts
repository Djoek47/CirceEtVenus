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

// POST: Link an existing Fansly account (already connected to API) to user's CRM profile
// This does NOT create new connections to the Fansly API - it just links existing accounts
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { accountId, username, displayName } = body

    // Validate required fields - we only need accountId and username from the pre-connected account
    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 })
    }

    // Store the connection in database - linking existing API account to CRM user
    const { error: dbError } = await supabase
      .from('platform_connections')
      .upsert({
        user_id: user.id,
        platform: 'fansly',
        platform_user_id: accountId,
        platform_username: username || displayName || 'Fansly User',
        is_connected: true,
        access_token: accountId, // Store accountId as token for API calls
        last_sync_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,platform'
      })

    if (dbError) {
      console.error('Database error linking Fansly account:', dbError)
      return NextResponse.json({ error: 'Failed to save connection' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      accountId: accountId,
      username: username || displayName
    })

  } catch (error) {
    console.error('Fansly link error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to link account' },
      { status: 500 }
    )
  }
}
