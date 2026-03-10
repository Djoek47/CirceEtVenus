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
    console.log('[v0] Conversations - Setting account ID:', connection.access_token)
    api.setAccountId(connection.access_token)

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    console.log('[v0] Conversations - Fetching with params:', { limit, offset, unreadOnly })
    const result = await api.getConversations({ limit, offset, unreadOnly })
    console.log('[v0] Conversations - Result:', JSON.stringify(result).slice(0, 500))

    return NextResponse.json({
      conversations: result.conversations || [],
      total: result.total || 0,
    })
  } catch (error) {
    console.error('[v0] Conversations - Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
