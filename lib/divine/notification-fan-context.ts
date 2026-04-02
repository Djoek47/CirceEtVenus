import type { SupabaseClient } from '@supabase/supabase-js'

type LooseSb = SupabaseClient<any, 'public', any, any>

export type NotifyPlatform = 'onlyfans' | 'fansly'

export type FanNotifySnapshot = {
  creator_classification: string | null
  tier: string | null
  total_spent: number
  thread_excerpt: string | null
  profile_tone: string | null
  notification_context: Record<string, unknown> | null
}

/**
 * Thread + fan row context for webhook notification copy and metadata (bounded sizes).
 */
export async function getFanNotifySnapshot(
  supabase: LooseSb,
  userId: string,
  platform: NotifyPlatform,
  platformFanId: string,
): Promise<FanNotifySnapshot> {
  const { data: fan } = await supabase
    .from('fans')
    .select('creator_classification, tier, subscription_tier, total_spent')
    .eq('user_id', userId)
    .eq('platform', platform)
    .eq('platform_fan_id', platformFanId)
    .maybeSingle()

  const { data: ins } = await supabase
    .from('fan_thread_insights')
    .select('summary_excerpt, thread_snapshot_text, profile_json, notification_context_json')
    .eq('user_id', userId)
    .eq('platform', platform)
    .eq('platform_fan_id', platformFanId)
    .maybeSingle()

  const row = ins as {
    summary_excerpt?: string | null
    thread_snapshot_text?: string | null
    profile_json?: unknown
    notification_context_json?: unknown
  } | null

  const excerptSource =
    (row?.summary_excerpt && String(row.summary_excerpt).trim()) ||
    (row?.thread_snapshot_text && String(row.thread_snapshot_text).trim().slice(0, 500)) ||
    null

  let profile_tone: string | null = null
  if (row?.profile_json && typeof row.profile_json === 'object') {
    const t = (row.profile_json as Record<string, unknown>).tone
    if (typeof t === 'string' && t.trim()) profile_tone = t.trim().slice(0, 120)
  }

  return {
    creator_classification:
      typeof fan?.creator_classification === 'string' && fan.creator_classification.trim()
        ? fan.creator_classification.trim().slice(0, 200)
        : null,
    tier:
      (typeof fan?.tier === 'string' && fan.tier) ||
      (typeof fan?.subscription_tier === 'string' && fan.subscription_tier) ||
      null,
    total_spent: fan?.total_spent != null ? Number(fan.total_spent) : 0,
    thread_excerpt: excerptSource ? excerptSource.slice(0, 280) : null,
    profile_tone,
    notification_context:
      row?.notification_context_json && typeof row.notification_context_json === 'object'
        ? (row.notification_context_json as Record<string, unknown>)
        : null,
  }
}

export function buildNotificationMetadataFromSnapshot(
  snap: FanNotifySnapshot,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  const meta: Record<string, unknown> = { ...extra }
  if (snap.creator_classification) meta.classification = snap.creator_classification
  if (snap.thread_excerpt) meta.thread_excerpt = snap.thread_excerpt
  if (snap.profile_tone) meta.tone = snap.profile_tone
  if (snap.tier) meta.spend_tier = snap.tier
  if (snap.notification_context) meta.thread_context = snap.notification_context
  return meta
}
