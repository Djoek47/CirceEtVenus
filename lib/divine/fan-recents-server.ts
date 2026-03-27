import type { SupabaseClient } from '@supabase/supabase-js'
import type { DivineDmConversationRow } from '@/lib/divine/divine-dm-conversations'

export type FanRecentRow = {
  user_id: string
  platform: string
  fan_id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  last_seen_at: string
}

const MAX_UPSERT = 80

/** Upsert fan rows from a live conversations list (OnlyFans). */
export async function upsertFanRecentsFromConversations(
  supabase: SupabaseClient,
  userId: string,
  conversations: DivineDmConversationRow[],
  platform: string = 'onlyfans',
): Promise<void> {
  const slice = conversations.filter((c) => c.fanId).slice(0, MAX_UPSERT)
  if (slice.length === 0) return
  const now = new Date().toISOString()
  const rows = slice.map((c) => ({
    user_id: userId,
    platform,
    fan_id: String(c.fanId),
    username: c.username?.slice(0, 200) ?? null,
    display_name: c.name?.slice(0, 200) ?? null,
    avatar_url: null as string | null,
    last_seen_at: now,
  }))
  const { error } = await supabase.from('divine_fan_recents').upsert(rows, {
    onConflict: 'user_id,platform,fan_id',
  })
  if (error) console.warn('[divine_fan_recents] upsert:', error.message)
}

/** Search cached fans by substring on username or display_name. */
export async function searchFanRecents(
  supabase: SupabaseClient,
  userId: string,
  q: string,
  limit: number = 20,
): Promise<FanRecentRow[]> {
  const term = q.trim().slice(0, 120)
  if (!term) return []
  const safe = term.replace(/%/g, '').replace(/_/g, '')
  const pattern = `%${safe}%`
  const lim = Math.min(limit, 50)
  const sel =
    'user_id, platform, fan_id, username, display_name, avatar_url, last_seen_at' as const
  const [u, d] = await Promise.all([
    supabase
      .from('divine_fan_recents')
      .select(sel)
      .eq('user_id', userId)
      .ilike('username', pattern)
      .order('last_seen_at', { ascending: false })
      .limit(lim),
    supabase
      .from('divine_fan_recents')
      .select(sel)
      .eq('user_id', userId)
      .ilike('display_name', pattern)
      .order('last_seen_at', { ascending: false })
      .limit(lim),
  ])
  const byKey = new Map<string, FanRecentRow>()
  for (const row of [...(u.data ?? []), ...(d.data ?? [])] as FanRecentRow[]) {
    const k = `${row.platform}:${row.fan_id}`
    if (!byKey.has(k)) byKey.set(k, row)
  }
  return [...byKey.values()]
    .sort((a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime())
    .slice(0, lim)
}

/** Client / Messages layout: upsert minimal rows after loading conversations. */
export async function upsertFanRecentsMinimal(
  supabase: SupabaseClient,
  userId: string,
  rows: Array<{
    fanId: string
    username?: string | null
    displayName?: string | null
    platform?: string
  }>,
): Promise<void> {
  const slice = rows.filter((r) => r.fanId).slice(0, MAX_UPSERT)
  if (slice.length === 0) return
  const now = new Date().toISOString()
  const data = slice.map((r) => ({
    user_id: userId,
    platform: r.platform ?? 'onlyfans',
    fan_id: String(r.fanId),
    username: r.username?.slice(0, 200) ?? null,
    display_name: r.displayName?.slice(0, 200) ?? null,
    avatar_url: null as string | null,
    last_seen_at: now,
  }))
  const { error } = await supabase.from('divine_fan_recents').upsert(data, {
    onConflict: 'user_id,platform,fan_id',
  })
  if (error) console.warn('[divine_fan_recents] upsert minimal:', error.message)
}

export async function getFanRecentById(
  supabase: SupabaseClient,
  userId: string,
  fanId: string,
  platform: string = 'onlyfans',
): Promise<FanRecentRow | null> {
  const { data, error } = await supabase
    .from('divine_fan_recents')
    .select('user_id, platform, fan_id, username, display_name, avatar_url, last_seen_at')
    .eq('user_id', userId)
    .eq('platform', platform)
    .eq('fan_id', fanId)
    .maybeSingle()
  if (error || !data) return null
  return data as FanRecentRow
}
