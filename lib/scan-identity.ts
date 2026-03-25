import type { SupabaseClient } from '@supabase/supabase-js'

/** Strip @ and trim; used for Serper queries and comparisons. */
export function normalizeScanHandle(raw: string): string {
  return raw.replace(/^@/, '').trim()
}

/**
 * All handles the user may use for reputation search (DB-backed only).
 * Used to validate optional `handles` on scan-reputation (no open proxy).
 */
export async function loadMergedHandlesForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<Set<string>> {
  const set = new Set<string>()
  const add = (s: string) => {
    const n = normalizeScanHandle(s)
    if (n) set.add(n)
  }

  const [{ data: profiles }, { data: platforms }, { data: profileRow }] = await Promise.all([
    supabase.from('social_profiles').select('username').eq('user_id', userId),
    supabase
      .from('platform_connections')
      .select('platform_username')
      .eq('user_id', userId)
      .eq('is_connected', true),
    supabase.from('profiles').select('former_usernames').eq('id', userId).maybeSingle(),
  ])

  for (const p of profiles || []) {
    const u = (p as { username?: string }).username
    if (u) add(u)
  }
  for (const p of platforms || []) {
    const u = (p as { platform_username?: string | null }).platform_username
    if (u) add(u)
  }
  const former = (profileRow as { former_usernames?: string[] | null })?.former_usernames
  if (Array.isArray(former)) {
    for (const h of former) {
      if (h) add(String(h))
    }
  }
  return set
}

/**
 * Keep only requested handles that exist in the allowed set (case-insensitive match to canonical stored form).
 */
export function filterHandlesToAllowed(requested: string[] | undefined, allowed: Set<string>): string[] {
  if (!requested?.length) return []
  const allowedLower = new Map<string, string>()
  for (const a of allowed) {
    allowedLower.set(normalizeScanHandle(a).toLowerCase(), normalizeScanHandle(a))
  }
  const out: string[] = []
  const seen = new Set<string>()
  for (const r of requested) {
    const n = normalizeScanHandle(r)
    const canon = allowedLower.get(n.toLowerCase())
    if (canon && !seen.has(canon.toLowerCase())) {
      seen.add(canon.toLowerCase())
      out.push(canon)
    }
  }
  return out
}

export type ScanIdentityHandle = {
  value: string
  source: string
  label: string
}

const PLATFORM_LABEL: Record<string, string> = {
  onlyfans: 'OnlyFans',
  fansly: 'Fansly',
  manyvids: 'ManyVids',
  twitter: 'X',
  instagram: 'Instagram',
  tiktok: 'TikTok',
}

/**
 * Labeled handles for UI pickers (reputation + leak).
 */
export async function loadScanIdentityHandles(
  supabase: SupabaseClient,
  userId: string,
): Promise<ScanIdentityHandle[]> {
  const [{ data: profiles }, { data: platforms }, { data: profileRow }] = await Promise.all([
    supabase.from('social_profiles').select('platform,username').eq('user_id', userId),
    supabase
      .from('platform_connections')
      .select('platform,platform_username')
      .eq('user_id', userId)
      .eq('is_connected', true),
    supabase.from('profiles').select('former_usernames').eq('id', userId).maybeSingle(),
  ])

  const out: ScanIdentityHandle[] = []
  const seen = new Set<string>()

  const push = (value: string, source: string, label: string) => {
    const v = normalizeScanHandle(value)
    if (!v || seen.has(v.toLowerCase())) return
    seen.add(v.toLowerCase())
    out.push({ value: v, source, label })
  }

  for (const p of platforms || []) {
    const plat = (p as { platform?: string; platform_username?: string | null }).platform || 'platform'
    const u = (p as { platform_username?: string | null }).platform_username
    if (!u) continue
    const name = PLATFORM_LABEL[plat] || plat
    push(u, plat, `${name} @${normalizeScanHandle(u)}`)
  }

  for (const p of profiles || []) {
    const plat = (p as { platform?: string; username?: string }).platform || 'social'
    const u = (p as { username?: string }).username
    if (!u) continue
    const name = PLATFORM_LABEL[plat] || plat
    push(u, `social_${plat}`, `${name} (manual) @${normalizeScanHandle(u)}`)
  }

  const former = (profileRow as { former_usernames?: string[] | null })?.former_usernames
  if (Array.isArray(former)) {
    for (const h of former) {
      if (h) push(String(h), 'former', `Former @${normalizeScanHandle(String(h))}`)
    }
  }

  return out
}
