import type { SupabaseClient } from '@supabase/supabase-js'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'
import { buildMessageContentForAi, hasMediaInRawMessage } from '@/lib/divine/of-thread-text'

export type DivineDmThreadLine = {
  from: 'creator' | 'fan'
  text: string
  createdAt: string
  hasMedia: boolean
}

/**
 * Load a fan DM thread for Divine (same shaping as POST /api/divine/dm-thread).
 */
export async function loadDivineDmThread(
  supabase: SupabaseClient,
  userId: string,
  fanId: string,
  messageLimit = 50,
): Promise<
  | { ok: true; thread: DivineDmThreadLine[] }
  | { ok: false; error: string; notFound?: boolean }
> {
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('access_token')
    .eq('user_id', userId)
    .eq('platform', 'onlyfans')
    .eq('is_connected', true)
    .maybeSingle()

  if (!connection?.access_token) {
    return { ok: false, error: 'OnlyFans not connected' }
  }

  const api = createOnlyFansAPI(connection.access_token)
  const limit = Math.min(Number(messageLimit) || 50, 100)
  let result: { messages?: unknown[] }
  try {
    result = await api.getMessages(String(fanId), { limit })
  } catch (e) {
    const msg = e instanceof Error ? e.message || '' : String(e ?? '')
    if (msg.toLowerCase().includes('resource was not found')) {
      return { ok: false, error: 'Thread not found for this fan.', notFound: true }
    }
    throw e
  }

  const messages = (result.messages || []).sort((a: any, b: any) => {
    const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0
    const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0
    return ta - tb
  })

  const thread: DivineDmThreadLine[] = []
  for (const m of messages) {
    const content = buildMessageContentForAi(m as Record<string, unknown>)
    if (!content) continue
    thread.push({
      from: (m as { isSentByMe?: boolean }).isSentByMe ? 'creator' : 'fan',
      text: content.slice(0, 500),
      createdAt: (m as { createdAt?: string }).createdAt ?? new Date().toISOString(),
      hasMedia: hasMediaInRawMessage(m as Record<string, unknown>),
    })
  }

  return { ok: true, thread }
}
