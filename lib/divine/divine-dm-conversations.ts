import type { SupabaseClient } from '@supabase/supabase-js'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'

export type DivineDmConversationRow = {
  fanId: string
  username: string
  name: string | null
  lastMessage: string | null
  lastMessageAt: string | null
  unreadCount: number
}

/**
 * Load recent OnlyFans DM conversations for a user (same data as GET /api/divine/dm-conversations).
 * Use from server routes and Divine tools — avoids server-to-server fetch + cookie issues on Vercel.
 */
export async function loadDivineDmConversations(
  supabase: SupabaseClient,
  userId: string,
  opts: { limit?: number; query?: string },
): Promise<{ conversations: DivineDmConversationRow[]; message?: string }> {
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('access_token')
    .eq('user_id', userId)
    .eq('platform', 'onlyfans')
    .eq('is_connected', true)
    .maybeSingle()

  if (!connection?.access_token) {
    return { conversations: [], message: 'OnlyFans not connected' }
  }

  const limit = Math.min(opts.limit ?? 30, 50)
  const rawQuery = (opts.query ?? '').trim()
  const query = rawQuery.toLowerCase()

  const api = createOnlyFansAPI(connection.access_token)
  const fetchLimit = rawQuery.length > 0 ? Math.min(Math.max(limit, 50), 100) : limit

  const result = await api
    .getConversations({ limit: fetchLimit, offset: 0, query: rawQuery || undefined })
    .catch(() => ({ conversations: [], total: 0 }))

  let conversations: DivineDmConversationRow[] = (result.conversations || []).map(
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

  return { conversations }
}
