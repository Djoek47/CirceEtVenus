import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { refreshFanThreadInsight } from '@/lib/divine/fan-thread-insight'
import type { DivineManagerAutomationRules } from '@/lib/divine-manager'
import { isHousekeepingWhaleTier } from '@/lib/divine/notification-priority'

export const maxDuration = 300

type Candidate = {
  platform: 'onlyfans' | 'fansly'
  fanId: string
  latestFanMessageAt: string
}

function getWhaleThreshold(rules: DivineManagerAutomationRules | null | undefined): number {
  const n = rules?.alerts?.message_whale_min_dollars
  if (typeof n === 'number' && Number.isFinite(n) && n > 0) return n
  return 100
}

function enabledForThreadUpdates(rules: DivineManagerAutomationRules | null | undefined): boolean {
  return rules?.jobs?.thread_auto_update_enabled === true
}

async function loadOnlyFansCandidates(supabase: ReturnType<typeof createServiceRoleClient>, userId: string): Promise<Candidate[]> {
  const { data: rows } = await supabase
    .from('messages')
    .select('from_fan_id, received_at, platform')
    .eq('user_id', userId)
    .eq('platform', 'onlyfans')
    .order('received_at', { ascending: false })
    .limit(1000)

  const byFan = new Map<string, string>()
  for (const r of rows ?? []) {
    const fanId = String((r as { from_fan_id?: string | null }).from_fan_id ?? '').trim()
    const at = String((r as { received_at?: string | null }).received_at ?? '').trim()
    if (!fanId || !at || byFan.has(fanId)) continue
    byFan.set(fanId, at)
  }

  return Array.from(byFan.entries()).map(([fanId, latestFanMessageAt]) => ({
    platform: 'onlyfans' as const,
    fanId,
    latestFanMessageAt,
  }))
}

async function loadFanslyCandidates(supabase: ReturnType<typeof createServiceRoleClient>, userId: string): Promise<Candidate[]> {
  const { data: fans } = await supabase
    .from('fans')
    .select('id, platform_fan_id')
    .eq('user_id', userId)
    .eq('platform', 'fansly')

  const fanIdMap = new Map<string, string>()
  for (const f of fans ?? []) {
    const id = String((f as { id?: string | null }).id ?? '')
    const platformFanId = String((f as { platform_fan_id?: string | null }).platform_fan_id ?? '')
    if (!id || !platformFanId) continue
    fanIdMap.set(id, platformFanId)
  }
  if (fanIdMap.size === 0) return []

  const { data: convs } = await supabase
    .from('conversations')
    .select('fan_id, unread_count, last_message_at')
    .eq('user_id', userId)
    .eq('platform', 'fansly')
    .gt('unread_count', 0)
    .order('last_message_at', { ascending: false })
    .limit(1000)

  const out: Candidate[] = []
  for (const c of convs ?? []) {
    const fanRowId = String((c as { fan_id?: string | null }).fan_id ?? '')
    const latestFanMessageAt = String((c as { last_message_at?: string | null }).last_message_at ?? '')
    if (!fanRowId || !latestFanMessageAt) continue
    const platformFanId = fanIdMap.get(fanRowId)
    if (!platformFanId) continue
    out.push({
      platform: 'fansly',
      fanId: platformFanId,
      latestFanMessageAt,
    })
  }
  return out
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const vercelCron = req.headers.get('x-vercel-cron')
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && vercelCron !== 'true') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const { data: settingsRows, error } = await supabase
    .from('divine_manager_settings')
    .select('user_id, automation_rules')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const enabledUsers = (settingsRows ?? []).filter((r) =>
    enabledForThreadUpdates((r as { automation_rules?: DivineManagerAutomationRules | null }).automation_rules ?? null),
  )

  const results: Array<{ userId: string; processed: number; skipped: number; errors: number }> = []

  for (const row of enabledUsers) {
    const userId = (row as { user_id: string }).user_id
    const rules = (row as { automation_rules?: DivineManagerAutomationRules | null }).automation_rules ?? null
    const whaleOnly = rules?.jobs?.thread_auto_update_whale_only !== false
    const whaleThreshold = getWhaleThreshold(rules)

    const [ofCandidates, fanslyCandidates] = await Promise.all([
      loadOnlyFansCandidates(supabase, userId),
      loadFanslyCandidates(supabase, userId),
    ])
    const candidates = [...ofCandidates, ...fanslyCandidates]

    const fanIds = Array.from(new Set(candidates.map((c) => `${c.platform}:${c.fanId}`)))
    const spendMap = new Map<string, { total: number; tier: string | null }>()
    if (fanIds.length > 0) {
      const { data: fanRows } = await supabase
        .from('fans')
        .select('platform, platform_fan_id, total_spent, tier, subscription_tier')
        .eq('user_id', userId)
      for (const fr of fanRows ?? []) {
        const platform = String((fr as { platform?: string }).platform ?? '')
        const fid = String((fr as { platform_fan_id?: string }).platform_fan_id ?? '')
        if (!platform || !fid) continue
        const total = Number((fr as { total_spent?: number | null }).total_spent ?? 0)
        const tier =
          ((fr as { tier?: string | null }).tier ??
            (fr as { subscription_tier?: string | null }).subscription_tier ??
            null)
        spendMap.set(`${platform}:${fid}`, { total, tier })
      }
    }

    let processed = 0
    let skipped = 0
    let errors = 0
    for (const c of candidates) {
      const fanSpend = spendMap.get(`${c.platform}:${c.fanId}`)
      const isWhale =
        (fanSpend?.total ?? 0) >= whaleThreshold || isHousekeepingWhaleTier(fanSpend?.tier)
      if (whaleOnly && !isWhale) {
        skipped += 1
        continue
      }
      try {
        const r = await refreshFanThreadInsight(supabase, userId, c.fanId, {
          platform: c.platform,
          mode: 'thread_update',
          latestFanMessageAt: c.latestFanMessageAt,
          skipDebounce: true,
        })
        if (r.ok && !r.skipped) processed += 1
        else skipped += 1
      } catch {
        errors += 1
      }
    }

    results.push({ userId, processed, skipped, errors })
  }

  return NextResponse.json({
    users: enabledUsers.length,
    results,
  })
}
