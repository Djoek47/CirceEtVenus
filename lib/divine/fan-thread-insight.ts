/**
 * Stored DM thread snapshots + merged fan personality for Divine (webhooks + manual refresh).
 */
import { createHash } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

type LooseSb = SupabaseClient<any, 'public', any, any>
import { createOnlyFansAPI } from '@/lib/onlyfans-api'
import {
  formatThreadTextForAi,
  normalizeSortedRawOfMessages,
} from '@/lib/divine/of-thread-text'
import { detectCreatorLikelyFromText } from '@/lib/divine/creator-detector'

export type FanThreadInsightPlatform = 'onlyfans' | 'fansly'
export type FanThreadRefreshMode = 'manual_scan' | 'thread_update'

const DEBOUNCE_MS = 90_000
const PROFILE_EVERY_N_ITERATIONS = 5
const HISTORY_MAX = 5
const MIN_PROFILE_THREAD_CHARS = 140

export type RefreshFanThreadResult =
  | {
      ok: true
      skipped: boolean
      iteration?: number
      profileUpdated?: boolean
      insufficientData?: boolean
      insufficientDataReason?: string
      mode?: FanThreadRefreshMode
      lastSeenFanMessageAt?: string | null
    }
  | { ok: false; error: string }

async function fetchFanslyThreadSnapshotFromDb(
  supabase: LooseSb,
  userId: string,
  platformFanId: string,
): Promise<{ text: string } | { error: string }> {
  const { data: fan, error: fanErr } = await supabase
    .from('fans')
    .select('id')
    .eq('user_id', userId)
    .eq('platform', 'fansly')
    .eq('platform_fan_id', platformFanId)
    .maybeSingle()

  if (fanErr) return { error: fanErr.message }
  if (!fan?.id) return { text: '' }

  const { data: conv, error: convErr } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_id', userId)
    .eq('platform', 'fansly')
    .eq('fan_id', fan.id)
    .maybeSingle()

  if (convErr) return { error: convErr.message }
  if (!conv?.id) return { text: '' }

  const { data: rows, error: msgErr } = await supabase
    .from('messages')
    .select('sender_type, content, sent_at')
    .eq('conversation_id', conv.id)
    .order('sent_at', { ascending: false })
    .limit(80)

  if (msgErr) return { error: msgErr.message }

  const chron = [...(rows ?? [])].reverse()
  const lines = chron.map((m: { sender_type?: string; content?: string | null }) => {
    const role = m.sender_type === 'creator' ? 'Creator' : 'Fan'
    const c = String(m.content || '')
      .trim()
      .replace(/\s+/g, ' ')
    return `${role}: ${c}`.slice(0, 400)
  })
  return { text: lines.join('\n').slice(0, 12000) }
}

async function fetchThreadSnapshotText(
  supabase: LooseSb,
  userId: string,
  fanId: string,
  platform: FanThreadInsightPlatform,
): Promise<{ text: string } | { error: string }> {
  if (platform === 'fansly') {
    return fetchFanslyThreadSnapshotFromDb(supabase, userId, fanId)
  }

  const { data: connection } = await supabase
    .from('platform_connections')
    .select('access_token')
    .eq('user_id', userId)
    .eq('platform', 'onlyfans')
    .eq('is_connected', true)
    .maybeSingle()

  if (!connection?.access_token) {
    return { error: 'OnlyFans not connected' }
  }

  const api = createOnlyFansAPI(connection.access_token)
  let threadRes: { messages?: unknown[] }
  try {
    threadRes = await api.getMessages(String(fanId), { limit: 80 })
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to fetch messages' }
  }

  const rawMessages = (threadRes.messages || []).sort((a: any, b: any) =>
    new Date(a?.createdAt || 0).getTime() - new Date(b?.createdAt || 0).getTime(),
  )
  const messages = normalizeSortedRawOfMessages(rawMessages)
  const text =
    messages.length > 0
      ? formatThreadTextForAi(messages, {
          lastN: 50,
          lineMax: 800,
          maxTotalChars: 12000,
        })
      : ''

  return { text: text.trim() }
}

function appendProfileHistory(
  current: unknown,
  entry: { iteration: number; profile_json: unknown; at: string },
): unknown[] {
  const arr = Array.isArray(current) ? [...current] : []
  arr.push(entry)
  return arr.slice(-HISTORY_MAX)
}

async function mergeFanProfileWithLlm(opts: {
  threadExcerpt: string
  previousProfile: unknown
  ofSummary: unknown
}): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const prev =
    opts.previousProfile && typeof opts.previousProfile === 'object'
      ? JSON.stringify(opts.previousProfile).slice(0, 4000)
      : '{}'
  const ofS = opts.ofSummary != null ? JSON.stringify(opts.ofSummary).slice(0, 2000) : ''

  try {
    const { generateText } = await import('ai')
    const { gateway } = await import('@ai-sdk/gateway')
    const { text } = await generateText({
      model: gateway('openai/gpt-4o-mini'),
      temperature: 0.2,
      maxOutputTokens: 900,
      prompt: `You merge a fan personality profile for an adult creator CRM. Output VALID JSON ONLY, no markdown.

Schema (all keys optional; use arrays of short strings; stay respectful and legal—no minors, no illegal content; skip explicit sexual detail, use tasteful labels if needed):
{
  "preferences": string[],
  "interests": string[],
  "hobbies": string[],
  "travel_plans": string[],
  "content_requests": string[],
  "relationship_notes": string,
  "tone": string
}

Rules:
- Merge with previous profile: keep stable traits unless the thread clearly contradicts them.
- Add new facts from the thread excerpt. Prefer recent messages for current requests.
- OnlyFans summary (if any) is auxiliary—prefer thread for freshness.

Previous profile JSON:
${prev}

OnlyFans summary (may be empty):
${ofS}

Recent thread (truncated):
${opts.threadExcerpt.slice(0, 8000)}`,
    })
    const raw = (text || '').trim()
    const jsonStart = raw.indexOf('{')
    const jsonEnd = raw.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd <= jsonStart) return null
    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as Record<string, unknown>
    return parsed
  } catch {
    return null
  }
}

/**
 * Upsert thread snapshot + hash (shared with dm-reply-package).
 */
export async function upsertFanThreadInsightSnapshot(
  supabase: LooseSb,
  userId: string,
  platformFanId: string,
  snapshotText: string,
  opts?: { bumpIteration?: boolean; platform?: FanThreadInsightPlatform },
): Promise<{ error?: string }> {
  const platform = opts?.platform ?? 'onlyfans'
  const trimmed = snapshotText.trim()
  if (!trimmed) return {}
  const reply_package_hash = createHash('sha256').update(trimmed).digest('hex').slice(0, 48)
  const now = new Date().toISOString()

  const { data: existing } = await supabase
    .from('fan_thread_insights')
    .select('iteration')
    .eq('user_id', userId)
    .eq('platform', platform)
    .eq('platform_fan_id', platformFanId)
    .maybeSingle()

  const bump = opts?.bumpIteration !== false
  const prevIt = (existing as { iteration?: number } | null)?.iteration ?? 0
  const nextIteration = bump ? prevIt + 1 : prevIt

  const patch: Record<string, unknown> = {
    user_id: userId,
    platform,
    platform_fan_id: platformFanId,
    thread_snapshot_text: trimmed.slice(0, 50000),
    reply_package_hash,
    summary_excerpt: trimmed.slice(0, 500),
    updated_at: now,
    last_thread_refresh_at: now,
    iteration: nextIteration,
    last_scan_at: now,
    last_scan_kind: 'manual_scan',
    insufficient_data: false,
    insufficient_data_reason: null,
  }

  const { error } = await supabase.from('fan_thread_insights').upsert(patch, {
    onConflict: 'user_id,platform,platform_fan_id',
  })
  return error ? { error: error.message } : {}
}

/**
 * Refresh stored thread + optionally merged profile (debounced for webhooks unless force).
 */
export async function refreshFanThreadInsight(
  supabase: LooseSb,
  userId: string,
  fanId: string,
  options?: {
    force?: boolean
    skipDebounce?: boolean
    platform?: FanThreadInsightPlatform
    mode?: FanThreadRefreshMode
    latestFanMessageAt?: string | null
  },
): Promise<RefreshFanThreadResult> {
  const platform = options?.platform ?? 'onlyfans'
  const mode = options?.mode ?? 'manual_scan'
  const force = options?.force === true
  const skipDebounce = options?.skipDebounce === true
  const latestFanMessageAt =
    typeof options?.latestFanMessageAt === 'string' && options.latestFanMessageAt.trim()
      ? options.latestFanMessageAt
      : null

  if (mode === 'thread_update' && !force && latestFanMessageAt) {
    const { data: row } = await supabase
      .from('fan_thread_insights')
      .select('last_seen_fan_message_at')
      .eq('user_id', userId)
      .eq('platform', platform)
      .eq('platform_fan_id', fanId)
      .maybeSingle()
    const lastSeen = (row as { last_seen_fan_message_at?: string | null } | null)?.last_seen_fan_message_at
    if (lastSeen && new Date(lastSeen).getTime() >= new Date(latestFanMessageAt).getTime()) {
      return {
        ok: true,
        skipped: true,
        iteration: undefined,
        profileUpdated: false,
        insufficientData: false,
        mode,
        lastSeenFanMessageAt: lastSeen,
      }
    }
  } else if (!skipDebounce && !force) {
    const { data: row } = await supabase
      .from('fan_thread_insights')
      .select('last_thread_refresh_at')
      .eq('user_id', userId)
      .eq('platform', platform)
      .eq('platform_fan_id', fanId)
      .maybeSingle()
    const at = (row as { last_thread_refresh_at?: string | null } | null)?.last_thread_refresh_at
    if (at) {
      const t = new Date(at).getTime()
      if (!Number.isNaN(t) && Date.now() - t < DEBOUNCE_MS) {
        return { ok: true, skipped: true, iteration: undefined, profileUpdated: false }
      }
    }
  }

  const snap = await fetchThreadSnapshotText(supabase, userId, fanId, platform)
  if ('error' in snap) {
    return { ok: false, error: snap.error }
  }

  if (!snap.text) {
    const { error } = await supabase.from('fan_thread_insights').upsert(
      {
        user_id: userId,
        platform,
        platform_fan_id: fanId,
        thread_snapshot_text: '',
        updated_at: new Date().toISOString(),
        last_thread_refresh_at: new Date().toISOString(),
        last_scan_kind: mode,
        insufficient_data: mode === 'manual_scan',
        insufficient_data_reason:
          mode === 'manual_scan' ? 'No messages yet. Ask the fan to chat more, then scan again.' : null,
        last_seen_fan_message_at: latestFanMessageAt,
      },
      { onConflict: 'user_id,platform,platform_fan_id' },
    )
    if (error) return { ok: false, error: error.message }
    return {
      ok: true,
      skipped: false,
      iteration: 0,
      profileUpdated: false,
      insufficientData: mode === 'manual_scan',
      insufficientDataReason:
        mode === 'manual_scan' ? 'No messages yet. Ask the fan to chat more, then scan again.' : undefined,
      mode,
      lastSeenFanMessageAt: latestFanMessageAt,
    }
  }

  const up = await upsertFanThreadInsightSnapshot(supabase, userId, fanId, snap.text, {
    bumpIteration: true,
    platform,
  })
  if (up.error) return { ok: false, error: up.error }

  const { data: ins } = await supabase
    .from('fan_thread_insights')
    .select('iteration, profile_json, profile_history')
    .eq('user_id', userId)
    .eq('platform', platform)
    .eq('platform_fan_id', fanId)
    .maybeSingle()

  const iteration = (ins as { iteration?: number })?.iteration ?? 1
  let profileUpdated = false
  const insufficientData =
    mode === 'manual_scan' && snap.text.replace(/\s+/g, ' ').trim().length < MIN_PROFILE_THREAD_CHARS
  const insufficientDataReason = insufficientData
    ? 'Not enough fan history yet to establish a reliable profile. Wait for more messages, then run Scan again.'
    : null

  const hadProfile = (ins as { profile_json?: unknown })?.profile_json != null
  const runProfile =
    force ||
    (!insufficientData && !hadProfile) ||
    iteration % PROFILE_EVERY_N_ITERATIONS === 0
  if (runProfile) {
    const { data: sumRow } =
      platform === 'onlyfans'
        ? await supabase
            .from('fan_ai_summaries')
            .select('summary_json')
            .eq('user_id', userId)
            .eq('platform_fan_id', fanId)
            .maybeSingle()
        : { data: null }

    const merged = await mergeFanProfileWithLlm({
      threadExcerpt: snap.text,
      previousProfile: (ins as { profile_json?: unknown })?.profile_json ?? {},
      ofSummary: (sumRow as { summary_json?: unknown } | null)?.summary_json ?? null,
    })

    if (merged) {
      const nowIso = new Date().toISOString()
      const creatorSignal = detectCreatorLikelyFromText(snap.text)
      const mergedWithSignal = {
        ...merged,
        creator_detector: creatorSignal,
      } as Record<string, unknown>
      const history = appendProfileHistory((ins as { profile_history?: unknown })?.profile_history, {
        iteration,
        profile_json: mergedWithSignal,
        at: nowIso,
      })
      await supabase
        .from('fan_thread_insights')
        .update({
          profile_json: mergedWithSignal,
          profile_history: history as unknown as Record<string, unknown>,
          updated_at: nowIso,
        })
        .eq('user_id', userId)
        .eq('platform', platform)
        .eq('platform_fan_id', fanId)
      profileUpdated = true

      // Keep a lightweight creator-signal memory for long-term profile tuning.
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('divine_voice_memory')
          .eq('id', userId)
          .maybeSingle()
        const current = ((prof as { divine_voice_memory?: unknown } | null)?.divine_voice_memory ??
          {}) as Record<string, unknown>
        const nextMemory = {
          ...current,
          creator_profile_scan: {
            ...(typeof current.creator_profile_scan === 'object' && current.creator_profile_scan
              ? (current.creator_profile_scan as Record<string, unknown>)
              : {}),
            lastFanId: String(fanId),
            lastPlatform: platform,
            lastCreatorSignal: creatorSignal,
            updatedAt: nowIso,
          },
        }
        await supabase
          .from('profiles')
          .update({ divine_voice_memory: nextMemory, updated_at: nowIso })
          .eq('id', userId)
      } catch {
        // best effort
      }
    }
  }

  const nowIso = new Date().toISOString()
  const creatorSignal = detectCreatorLikelyFromText(snap.text)
  const notificationContext = {
    mode,
    fan_id: String(fanId),
    platform,
    updated_at: nowIso,
    creator_detector: creatorSignal,
    profile_updated: profileUpdated,
    insufficient_data: insufficientData,
    thread_excerpt: snap.text.slice(0, 280),
  }
  await supabase
    .from('fan_thread_insights')
    .update({
      last_scan_kind: mode,
      last_seen_fan_message_at: latestFanMessageAt,
      last_scan_at: mode === 'manual_scan' ? nowIso : undefined,
      last_update_at: mode === 'thread_update' ? nowIso : undefined,
      insufficient_data: insufficientData,
      insufficient_data_reason: insufficientData ? insufficientDataReason : null,
      notification_context_json: notificationContext,
      updated_at: nowIso,
    })
    .eq('user_id', userId)
    .eq('platform', platform)
    .eq('platform_fan_id', fanId)

  return {
    ok: true,
    skipped: false,
    iteration,
    profileUpdated,
    insufficientData,
    insufficientDataReason: insufficientDataReason ?? undefined,
    mode,
    lastSeenFanMessageAt: latestFanMessageAt,
  }
}
