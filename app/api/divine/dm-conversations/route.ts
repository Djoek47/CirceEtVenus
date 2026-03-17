import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET: List recent DM conversations for Divine (voice/chat) context.
 * Returns a short summary suitable for the AI to reference.
 *
 * Query params:
 * - limit: max conversations (default 30, max 50)
 * - query: optional substring to filter by username or name (case-insensitive)
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: connection } = await supabase
      .from('platform_connections')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('platform', 'onlyfans')
      .eq('is_connected', true)
      .maybeSingle()

    if (!connection?.access_token) {
      return NextResponse.json({ conversations: [], message: 'OnlyFans not connected' })
    }

    const url = new URL(request.url)
    const limit = Math.min(Number(url.searchParams.get('limit')) || 30, 50)
    const query = (url.searchParams.get('query') || '').trim().toLowerCase()

    const { createOnlyFansAPI } = await import('@/lib/onlyfans-api')
    const api = createOnlyFansAPI(connection.access_token)
    const result = await api
      .getConversations({ limit, offset: 0 })
      .catch(() => ({ conversations: [], total: 0 }))

    let conversations = (result.conversations || []).map(
      (c: {
        user?: { id?: string; username?: string; name?: string }
        lastMessage?: { text?: string; createdAt?: string }
        unreadCount?: number
      }) => ({
        fanId: c.user?.id ?? '',
        username: c.user?.username ?? 'unknown',
        name: c.user?.name ?? null,
        lastMessage: c.lastMessage?.text ? String(c.lastMessage.text).slice(0, 120) : null,
        lastMessageAt: c.lastMessage?.createdAt ?? null,
        unreadCount: c.unreadCount ?? 0,
      }),
    )

    if (query) {
      conversations = conversations.filter((c) => {
        const haystack = `${c.username ?? ''} ${c.name ?? ''}`.toLowerCase()
        return haystack.includes(query)
      })
    }

    conversations = conversations.slice(0, limit)

    return NextResponse.json({ conversations })
  } catch (e) {
    console.error('[divine/dm-conversations]', e)
    return NextResponse.json(
      { error: 'Failed to fetch conversations', conversations: [] },
      { status: 500 },
    )
  }
}

