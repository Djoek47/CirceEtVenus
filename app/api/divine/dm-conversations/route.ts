import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { loadDivineDmConversations } from '@/lib/divine/divine-dm-conversations'

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
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(request.url)
    const limit = Math.min(Number(url.searchParams.get('limit')) || 30, 50)
    const rawQuery = (url.searchParams.get('query') || '').trim()

    const cacheKey = `${user.id}:${limit}:${rawQuery}`
    const cached = dmConversationsCache.get(cacheKey)
    if (cached && cached.expires > Date.now()) {
      return NextResponse.json(cached.body)
    }

    const { conversations, message } = await loadDivineDmConversations(supabase, user.id, {
      limit,
      query: rawQuery,
    })

    const body = message ? { conversations, message } : { conversations }
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

