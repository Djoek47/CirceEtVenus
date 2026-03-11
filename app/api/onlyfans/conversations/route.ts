import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the OnlyFans connection
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('platform', 'onlyfans')
      .eq('is_connected', true)
      .single()

    if (!connection) {
      return NextResponse.json({ error: 'OnlyFans not connected' }, { status: 400 })
    }

    const api = createOnlyFansAPI()
    
    // Fetch fresh account ID from API (stored token may be outdated)
    const accountsResult = await api.listAccounts()
    if (!accountsResult.success || !accountsResult.accounts || accountsResult.accounts.length === 0) {
      return NextResponse.json({ error: 'No OnlyFans accounts found' }, { status: 400 })
    }
    
    const account = accountsResult.accounts[accountsResult.accounts.length - 1]
    api.setAccountId(account.id)

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    const result = await api.getConversations({ limit, offset, unreadOnly })

    return NextResponse.json({
      conversations: result.conversations || [],
      total: result.total || 0,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    // Surface OnlyFans session expiry and auto-disconnect so the user can reconnect
    if (message.includes('ONLYFANS_SESSION_EXPIRED')) {
      try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase
            .from('platform_connections')
            .update({ is_connected: false, access_token: null })
            .eq('user_id', user.id)
            .eq('platform', 'onlyfans')
        }
      } catch {
        // best-effort; still return 401
      }
      return NextResponse.json(
        {
          error: 'OnlyFans session expired',
          code: 'ONLYFANS_SESSION_EXPIRED',
          message:
            'Your OnlyFans session with our data partner expired. Please reconnect OnlyFans from your dashboard to continue syncing messages.',
        },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch conversations', details: message },
      { status: 500 }
    )
  }
}
