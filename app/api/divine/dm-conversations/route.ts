import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** Short-lived cache to reduce OnlyFans API churn (per user + query). */
const dmConversationsCache = new Map<string, { expires: number; body: unknown }>()
const DM_CONV_CACHE_TTL_MS = 50_000

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
    const rawQuery = (url.searchParams.get('query') || '').trim()
    const query = rawQuery.toLowerCase()

    const cacheKey = `${user.id}:${limit}:${rawQuery}`
    const cached = dmConversationsCache.get(cacheKey)
    if (cached && cached.expires > Date.now()) {
      return NextResponse.json(cached.body)
    }

    const { createOnlyFansAPI } = await import('@/lib/onlyfans-api')
    const api = createOnlyFansAPI(connection.access_token)
    const fetchLimit =
      rawQuery.length > 0
        ? Math.min(Math.max(limit, 50), 100)
        : limit
    const result = await api
      .getConversations({ limit: fetchLimit, offset: 0, query: rawQuery || undefined })
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

    const body = { conversations }
    dmConversationsCache.set(cacheKey, { expires: Date.now() + DM_CONV_CACHE_TTL_MS, body })
    if (dmConversationsCache.size > 200) {
      const now = Date.now()
      for (const [k, v] of dmConversationsCache) {
        if (v.expires <= now) dmConversationsCache.delete(k)
      }
    }

    return NextResponse.json(body)
  } catch (e) {
    console.error('[divine/dm-conversations]', e)
    return NextResponse.json(
      { error: 'Failed to fetch conversations', conversations: [] },
      { status: 500 },
    )
  }
}

