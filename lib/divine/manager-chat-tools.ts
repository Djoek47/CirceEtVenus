/**
 * Shared Divine Manager tool execution for chat and voice (single source of truth).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { executeDivineIntentPost, type IntentBody } from '@/lib/divine/divine-intent-execute'
import { runLeakScan } from '@/lib/leaks/run-scan'
import { runReputationScanCore } from '@/lib/reputation/run-reputation-scan'
import { runReputationBriefingCore } from '@/lib/reputation/briefing-server'
import {
  addLeakSearchIdentities,
  addReputationManualHandles,
  removeLeakSearchIdentities,
  removeReputationManualHandles,
} from '@/lib/divine/reputation-identity-server'
import { runAiStudioToolServer } from '@/lib/divine/run-ai-studio-tool'
import { runDivineAiToolServer, isDivineAiToolId } from '@/lib/divine/run-ai-tool-core'
import { fetchDmReplySuggestionsPackage } from '@/lib/divine/dm-reply-package'
import type { DivineDmConversationRow } from '@/lib/divine/divine-dm-conversations'
import { loadDivineDmConversations } from '@/lib/divine/divine-dm-conversations'
import type { DivineLookupMeta } from '@/lib/divine/divine-lookup-meta'
import {
  appendLookupMetaBlock,
  buildDedupeKey,
  formatSpellbackLine,
  rankConversationsByQuery,
  toCandidates,
  truncatePreservingLookupMeta,
} from '@/lib/divine/divine-lookup-meta'
import { loadDivineDmThread } from '@/lib/divine/divine-dm-thread'
import { isDivineFullAccess, DIVINE_FULL_UPGRADE_MESSAGE } from '@/lib/divine/divine-full-access'
import { draftFanReplyWithMimic } from '@/lib/divine/draft-fan-reply'
import { refreshFanThreadInsight } from '@/lib/divine/fan-thread-insight'
import type { DivineUiAction } from '@/lib/divine/divine-ui-actions'
import { DIVINE_TRANSCRIPT_MAX, normalizeScanForUi } from '@/lib/divine/divine-ui-actions'
import type { DmReplyPackageResult } from '@/lib/divine/dm-reply-package'
import { getStats } from '@/lib/divine-intent-actions'
import { getVoiceMemoryPayload } from '@/lib/divine/voice-memory-server'
import { queueThreadScanBackgroundJob, recordStatsTaskForBarrier } from '@/lib/divine/thread-scan-async'
import { getSettings } from '@/lib/divine-manager'
import { upsertFanRecentsFromConversations, searchFanRecents } from '@/lib/divine/fan-recents-server'
import { getPlatformConnectionSnapshot } from '@/lib/divine/platform-connection-status'

export const AI_TOOL_NAME_TO_ID: Record<string, string> = {
  analyze_content: 'standard-of-attraction',
  generate_caption: 'caption-generator',
  predict_viral: 'viral-predictor',
  get_retention_insights: 'churn-predictor',
  get_whale_advice: 'whale-whisperer',
}

/** Tools implemented in runContextTool (DB + internal helpers, not /api/divine/intent). */
export const CONTEXT_TOOL_NAMES = new Set<string>([
  'get_dm_thread',
  'get_reply_suggestions',
  'get_dm_thread_and_suggestions',
  'list_leak_alerts',
  'update_leak_alert_case',
  'trigger_reputation_briefing',
  'list_reputation_mentions',
  'get_integrations_summary',
  'get_scheduled_content_summary',
  'list_cosmic_calendar',
  'list_content',
  'run_leak_scan',
  'run_reputation_scan',
  'draft_fan_reply',
  'analyze_image_from_url',
  'add_reputation_identity',
  'remove_reputation_identity',
  'add_leak_search_identity',
  'remove_leak_search_identity',
  'get_fan_thread_insights',
  'refresh_fan_thread_scan',
  'get_reputation_briefing',
  'list_reputation_briefings',
  'get_task_status',
  'list_vault_for_dm',
  'get_content_sales_metadata',
])

export type { DivineUiAction } from '@/lib/divine/divine-ui-actions'

export const ALLOWED_UI_PATHS = new Set<string>([
  '/dashboard',
  '/dashboard/messages',
  '/dashboard/content',
  '/dashboard/protection',
  '/dashboard/mentions',
  '/dashboard/fans',
  '/dashboard/analytics',
  '/dashboard/divine-manager',
  '/dashboard/ai-studio',
  '/dashboard/social',
  '/dashboard/settings',
  '/dashboard/guide',
])

const AI_STUDIO_TOOL_PATH = /^\/dashboard\/ai-studio\/tools\/[a-z0-9][a-z0-9-]{0,79}$/i

/** Allows dashboard links with validated query params (Divine Manager section, AI Studio tab/ai). */
export function isAllowedUiNavigatePath(path: string): boolean {
  const trimmed = path.trim()
  if (!trimmed.startsWith('/dashboard')) return false
  if (ALLOWED_UI_PATHS.has(trimmed)) return true
  const base = trimmed.split('?')[0]
  if (!ALLOWED_UI_PATHS.has(base)) {
    if (AI_STUDIO_TOOL_PATH.test(base)) return !trimmed.includes('?')
    return false
  }
  if (!trimmed.includes('?')) return true
  try {
    const qs = trimmed.slice(trimmed.indexOf('?'))
    const params = new URLSearchParams(qs)
    const keys = [...params.keys()]
    if (base === '/dashboard/divine-manager') {
      if (keys.length === 0) return true
      if (keys.length !== 1 || keys[0] !== 'section') return false
      const v = params.get('section') ?? ''
      return /^[a-z0-9_-]{1,40}$/i.test(v)
    }
    if (base === '/dashboard/ai-studio') {
      for (const k of keys) {
        if (k !== 'tab' && k !== 'ai') return false
      }
      const tab = params.get('tab')
      if (tab && !['overview', 'circe', 'venus', 'cosmic', 'tools', 'chatter'].includes(tab)) return false
      const ai = params.get('ai')
      if (ai && !['circe', 'venus'].includes(ai)) return false
      return true
    }
    if (base === '/dashboard/messages') {
      if (keys.length === 0) return true
      if (keys.length !== 1 || keys[0] !== 'fanId') return false
      const fanId = params.get('fanId') ?? ''
      return /^[a-z0-9_-]{1,64}$/i.test(fanId)
    }
    if (base === '/dashboard/settings') {
      if (keys.length === 0) return true
      if (keys.length !== 1 || keys[0] !== 'tab') return false
      const tab = params.get('tab') ?? ''
      return ['profile', 'notifications', 'security', 'billing', 'integrations', 'data', 'preferences'].includes(tab)
    }
    return false
  } catch {
    return false
  }
}

export function getBaseUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

async function isProPlanUser(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_id')
    .eq('user_id', userId)
    .maybeSingle()
  const pid = String((subscription as { plan_id?: string } | null)?.plan_id ?? '').toLowerCase()
  return ['venus-pro', 'circe-elite', 'divine-duo'].includes(pid)
}

function parseHandlesArg(raw: unknown): string[] {
  if (typeof raw === 'string' && raw.trim()) return [raw.trim()]
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((s) => s.trim())
}

function parseTitleHintsArg(raw: unknown): string[] {
  if (typeof raw === 'string' && raw.trim()) return [raw.trim()]
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((s) => s.trim())
}

export async function runAITool(
  toolName: string,
  args: Record<string, unknown>,
  cookie: string,
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  const toolId = AI_TOOL_NAME_TO_ID[toolName]
  if (!toolId) return { success: false, error: 'Unknown AI tool' }
  if (!isDivineAiToolId(toolId)) return { success: false, error: 'Unknown AI tool' }
  return runDivineAiToolServer(toolId, args, cookie)
}

export type DivineContext = {
  supabase: SupabaseClient
  userId: string
}

export function parseOpenPanelArg(raw: unknown): 'scan' | 'circe' | 'venus' | 'flirt' | 'all' | undefined {
  if (typeof raw !== 'string') return undefined
  const s = raw.toLowerCase().trim()
  if (s === 'scan' || s === 'circe' || s === 'venus' || s === 'flirt' || s === 'all') return s
  return undefined
}

export function openPanelToHighlightPanel(
  openPanel: ReturnType<typeof parseOpenPanelArg>,
): 'circe' | 'venus' | 'flirt' | null {
  if (openPanel === 'circe' || openPanel === 'venus' || openPanel === 'flirt') return openPanel
  return null
}

function formatDmReplyToolText(
  name: 'get_reply_suggestions' | 'get_dm_thread_and_suggestions',
  pkg: DmReplyPackageResult,
): string {
  if ('error' in pkg && pkg.error) return pkg.error
  if (name === 'get_dm_thread_and_suggestions' && 'message' in pkg && pkg.message === 'No messages in thread.') {
    return 'No messages in thread.'
  }
  const data = pkg as Extract<DmReplyPackageResult, { circeSuggestions: string[] }>
  const rec = data.recommendation
    ? `Recommendation: ${data.recommendation.toUpperCase()}. ${data.recommendationReason ?? ''}`
    : ''
  const circe = (data.circeSuggestions ?? [])[0] ? `Circe: ${data.circeSuggestions![0].slice(0, 150)}...` : ''
  const venus = (data.venusSuggestions ?? [])[0] ? `Venus: ${data.venusSuggestions![0].slice(0, 150)}...` : ''
  const flirt = (data.flirtSuggestions ?? [])[0] ? `Flirt: ${data.flirtSuggestions![0].slice(0, 150)}...` : ''
  const scanObj =
    data.scan && typeof data.scan === 'object' && data.scan !== null && 'insights' in data.scan
      ? (data.scan as { insights?: string[] })
      : null
  const scanLine = scanObj?.insights?.length ? `Scan: ${scanObj.insights.slice(0, 2).join('; ')}` : ''
  if (name === 'get_reply_suggestions') {
    return [scanLine, rec, circe, venus, flirt].filter(Boolean).join('\n') || 'No suggestions generated.'
  }
  const threadBlock = data.threadPreview ? `Thread:\n${data.threadPreview}` : ''
  return [threadBlock, scanLine, rec, circe, venus, flirt].filter(Boolean).join('\n\n') || 'No suggestions.'
}

function buildShowDmReplySuggestionsAction(
  fanId: string,
  pkg: DmReplyPackageResult,
  highlightPanel: 'circe' | 'venus' | 'flirt' | null,
): Extract<DivineUiAction, { type: 'show_dm_reply_suggestions' }> | null {
  if ('error' in pkg && pkg.error) return null
  const p = pkg as Extract<DmReplyPackageResult, { circeSuggestions: string[] }>
  return {
    type: 'show_dm_reply_suggestions',
    fanId,
    scan: normalizeScanForUi(p.scan),
    circeSuggestions: p.circeSuggestions ?? [],
    venusSuggestions: p.venusSuggestions ?? [],
    flirtSuggestions: p.flirtSuggestions ?? [],
    highlightPanel,
    recommendation: p.recommendation ?? undefined,
    recommendationReason: p.recommendationReason ?? undefined,
  }
}

async function getDmFocusPresentation(
  supabase: SupabaseClient,
  userId: string,
): Promise<'overlay' | 'navigate'> {
  const settings = await getSettings(supabase, userId)
  const mode = settings?.automation_rules?.dm_focus_mode ?? 'navigate'
  return mode === 'overlay' ? 'overlay' : 'navigate'
}

function fanRecentToConversationRow(r: {
  fan_id: string
  username: string | null
  display_name: string | null
}): DivineDmConversationRow {
  return {
    fanId: r.fan_id,
    username: r.username ?? 'unknown',
    name: r.display_name,
    lastMessage: null,
    lastMessageAt: null,
    unreadCount: 0,
  }
}

/** Non-exact lookups: land on Messages so the creator can confirm or pick (avoids “stuck” off-page). */
function prependMessagesNavForNonExactLookup(
  uiActions: DivineUiAction[],
  resolved: DivineLookupMeta['resolved'],
) {
  if (
    resolved === 'multi_match_confirm_required' ||
    resolved === 'fuzzy_ambiguous' ||
    resolved === 'fuzzy_confirm_required' ||
    resolved === 'no_match'
  ) {
    uiActions.unshift({ type: 'navigate', path: '/dashboard/messages' })
  }
}

function finalizeLookupToolReturn(
  content: string,
  uiActions: DivineUiAction[],
  lookupMeta: DivineLookupMeta | null,
): { content: string; uiActions: DivineUiAction[]; lookupMeta: DivineLookupMeta | null } {
  if (lookupMeta) {
    prependMessagesNavForNonExactLookup(uiActions, lookupMeta.resolved)
  }
  return { content, uiActions, lookupMeta }
}

/** Shared with runToolCall — spellback, lookup_meta, fuzzy fallbacks; focus_fan only on confident single exact match. */
export async function runGetDmConversationsToolResult(
  supabase: SupabaseClient,
  userId: string,
  args: Record<string, unknown>,
): Promise<{ content: string; uiActions: DivineUiAction[]; lookupMeta: DivineLookupMeta | null }> {
  const limit = typeof args.limit === 'number' ? Math.min(Math.max(args.limit, 1), 50) : 20
  const rawQuery = typeof args.query === 'string' ? args.query.trim() : ''
  const { conversations, message } = await loadDivineDmConversations(supabase, userId, { limit, query: rawQuery })
  const uiActions: DivineUiAction[] = []

  if (message === 'OnlyFans not connected') {
    return { content: 'OnlyFans is not connected. Connect OnlyFans in Settings → Integrations.', uiActions, lookupMeta: null }
  }
  if (conversations.length > 0) {
    await upsertFanRecentsFromConversations(supabase, userId, conversations)
  }

  const list = conversations.slice(0, 15).map((c) => {
    const label = c.name ? `${c.name} (@${c.username})` : `@${c.username}`
    const last = c.lastMessage ?? ''
    return `${label} [id: ${c.fanId}]${c.unreadCount ? ` [${c.unreadCount} unread]` : ''}: ${last.slice(0, 60)}`
  })
  const listBody = list.length
    ? `Recent conversations (name, username, fanId, last message):\n${list.join('\n')}`
    : 'No recent conversations.'

  if (!rawQuery) {
    const meta: DivineLookupMeta = {
      tool: 'get_dm_conversations',
      heard_query: '',
      resolved: 'browse',
      candidates: [],
      dedupe_key: buildDedupeKey('', []),
      next_step_hint: 'Browse results or pass query to search.',
    }
    return finalizeLookupToolReturn(appendLookupMetaBlock(listBody, meta), uiActions, meta)
  }

  let content = formatSpellbackLine(rawQuery) + listBody

  if (conversations.length === 1 && conversations[0].fanId) {
    const presentation = await getDmFocusPresentation(supabase, userId)
    uiActions.push({ type: 'focus_fan', fanId: conversations[0].fanId, presentation })
    content += `\n\n[resolved_fan_id:${conversations[0].fanId}]`
    const meta: DivineLookupMeta = {
      tool: 'get_dm_conversations',
      heard_query: rawQuery,
      resolved: 'exact',
      candidates: toCandidates([{ row: conversations[0], score: 1 }]),
      dedupe_key: buildDedupeKey(rawQuery, toCandidates([{ row: conversations[0], score: 1 }])),
      next_step_hint:
        'Exact match — chat opens in app. Do not call get_dm_conversations again with the same query. Use get_dm_thread with this fanId.',
    }
    return finalizeLookupToolReturn(appendLookupMetaBlock(content, meta), uiActions, meta)
  }

  if (conversations.length > 1) {
    const top = conversations.slice(0, 3).map((row) => ({ row, score: 1 }))
    const cands = toCandidates(top)
    const meta: DivineLookupMeta = {
      tool: 'get_dm_conversations',
      heard_query: rawQuery,
      resolved: 'multi_match_confirm_required',
      candidates: cands,
      dedupe_key: buildDedupeKey(rawQuery, cands),
      next_step_hint:
        'Do NOT call get_dm_conversations again with the same query. Ask which fanId to open or use ui_focus_fan(fanId).',
    }
    content +=
      '\n\nMultiple matches — ask the creator which fan to open (fanId) or narrow the name.'
    return finalizeLookupToolReturn(appendLookupMetaBlock(content, meta), uiActions, meta)
  }

  const broad = await loadDivineDmConversations(supabase, userId, { limit: 80, query: '' })
  if (broad.conversations.length > 0) {
    await upsertFanRecentsFromConversations(supabase, userId, broad.conversations)
  }
  const ranked = rankConversationsByQuery(rawQuery, broad.conversations, 8)

  if (ranked.length === 0) {
    const meta: DivineLookupMeta = {
      tool: 'get_dm_conversations',
      heard_query: rawQuery,
      resolved: 'no_match',
      candidates: [],
      dedupe_key: buildDedupeKey(rawQuery, []),
      next_step_hint:
        'No match. Do NOT repeat get_dm_conversations with the same query. Ask the creator to re-say or retype the exact username, or provide fan id.',
    }
    content += '\n\nNo close matches in recent chats. Ask them to confirm spelling or open Messages to copy fan id.'
    return finalizeLookupToolReturn(appendLookupMetaBlock(content, meta), uiActions, meta)
  }

  const best = ranked[0]!
  const second = ranked[1]

  if (best.score >= 0.78 && (!second || second.score < 0.52)) {
    const cands = toCandidates([best])
    const meta: DivineLookupMeta = {
      tool: 'get_dm_conversations',
      heard_query: rawQuery,
      resolved: 'fuzzy_confirm_required',
      candidates: cands,
      dedupe_key: buildDedupeKey(rawQuery, cands),
      next_step_hint:
        'Fuzzy best — do NOT open chat until confirmed. Ask “Is this the right fan?” then ui_focus_fan(fanId). Do NOT call get_dm_conversations again.',
    }
    const label = best.row.name ? `${best.row.name} (@${best.row.username})` : `@${best.row.username}`
    content += `\n\nClosest match (please confirm): ${label} [id: ${best.row.fanId}] (similarity ~${(best.score * 100).toFixed(0)}%).`
    return finalizeLookupToolReturn(appendLookupMetaBlock(content, meta), uiActions, meta)
  }

  const top3 = ranked.slice(0, 3)
  const cands = toCandidates(top3)
  const meta: DivineLookupMeta = {
    tool: 'get_dm_conversations',
    heard_query: rawQuery,
    resolved: 'fuzzy_ambiguous',
    candidates: cands,
    dedupe_key: buildDedupeKey(rawQuery, cands),
    next_step_hint:
      'List options 1–3 with fanIds. Do NOT call get_dm_conversations again with the same query.',
  }
  content += '\n\nPossible fuzzy matches — ask which option or use fan id.'
  return finalizeLookupToolReturn(appendLookupMetaBlock(content, meta), uiActions, meta)
}

export async function runLookupFanToolResult(
  supabase: SupabaseClient,
  userId: string,
  args: Record<string, unknown>,
): Promise<{ content: string; uiActions: DivineUiAction[]; lookupMeta: DivineLookupMeta | null }> {
  const rawQuery = typeof args.query === 'string' ? args.query.trim() : ''
  const uiActions: DivineUiAction[] = []
  if (!rawQuery) {
    return { content: 'query is required (name or username substring).', uiActions, lookupMeta: null }
  }

  const cached = await searchFanRecents(supabase, userId, rawQuery, 20)
  if (cached.length > 0) {
    const rows = cached.map(fanRecentToConversationRow)
    const ranked = rankConversationsByQuery(rawQuery, rows, 20)
    const ordered = ranked.length ? ranked : rows.map((row) => ({ row, score: 0.6 }))
    const lines = ordered.slice(0, 15).map(({ row }) => {
      const label = row.name ? `${row.name} (@${row.username})` : `@${row.username}`
      return `${label} [fanId: ${row.fanId}]`
    })
    let content = formatSpellbackLine(rawQuery) + `Cached fans (recent DMs):\n${lines.join('\n')}`

    if (cached.length === 1 && cached[0].fan_id) {
      const presentation = await getDmFocusPresentation(supabase, userId)
      uiActions.push({ type: 'focus_fan', fanId: String(cached[0].fan_id), presentation })
      content += `\n\n[resolved_fan_id:${cached[0].fan_id}]`
      const row = rows[0]!
      const meta: DivineLookupMeta = {
        tool: 'lookup_fan',
        heard_query: rawQuery,
        resolved: 'exact',
        candidates: toCandidates([{ row, score: 1 }]),
        dedupe_key: buildDedupeKey(rawQuery, toCandidates([{ row, score: 1 }])),
        next_step_hint: 'Exact cache hit — chat opens. Do not call lookup_fan again with the same query.',
      }
      return finalizeLookupToolReturn(appendLookupMetaBlock(content, meta), uiActions, meta)
    }

    const top3 = ordered.slice(0, 3)
    const cands = toCandidates(top3)
    const meta: DivineLookupMeta = {
      tool: 'lookup_fan',
      heard_query: rawQuery,
      resolved: 'multi_match_confirm_required',
      candidates: cands,
      dedupe_key: buildDedupeKey(rawQuery, cands),
      next_step_hint: 'Do NOT call lookup_fan again with the same query. Ask which fanId.',
    }
    content += '\n\nMultiple cached matches — ask fanId or narrow the query.'
    return finalizeLookupToolReturn(appendLookupMetaBlock(content, meta), uiActions, meta)
  }

  const { conversations, message } = await loadDivineDmConversations(supabase, userId, { limit: 30, query: rawQuery })
  if (message === 'OnlyFans not connected') {
    return { content: 'OnlyFans is not connected. Connect OnlyFans in Settings → Integrations.', uiActions, lookupMeta: null }
  }
  if (conversations.length > 0) {
    await upsertFanRecentsFromConversations(supabase, userId, conversations)
  }

  const linesOf = (conv: typeof conversations) =>
    conv.slice(0, 15).map((c) => {
      const label = c.name ? `${c.name} (@${c.username})` : `@${c.username}`
      return `${label} [fanId: ${c.fanId}]`
    })

  let content = formatSpellbackLine(rawQuery)

  if (conversations.length === 1 && conversations[0].fanId) {
    const presentation = await getDmFocusPresentation(supabase, userId)
    uiActions.push({ type: 'focus_fan', fanId: conversations[0].fanId, presentation })
    content += `Matches from OnlyFans:\n${linesOf(conversations).join('\n')}\n\n[resolved_fan_id:${conversations[0].fanId}]`
    const meta: DivineLookupMeta = {
      tool: 'lookup_fan',
      heard_query: rawQuery,
      resolved: 'exact',
      candidates: toCandidates([{ row: conversations[0], score: 1 }]),
      dedupe_key: buildDedupeKey(rawQuery, toCandidates([{ row: conversations[0], score: 1 }])),
      next_step_hint: 'Exact match — do not call lookup_fan again.',
    }
    return finalizeLookupToolReturn(appendLookupMetaBlock(content, meta), uiActions, meta)
  }

  if (conversations.length > 1) {
    const top = conversations.slice(0, 3).map((row) => ({ row, score: 1 }))
    const cands = toCandidates(top)
    const meta: DivineLookupMeta = {
      tool: 'lookup_fan',
      heard_query: rawQuery,
      resolved: 'multi_match_confirm_required',
      candidates: cands,
      dedupe_key: buildDedupeKey(rawQuery, cands),
      next_step_hint: 'Do NOT call lookup_fan again. Ask which fanId.',
    }
    content += `Matches from OnlyFans:\n${linesOf(conversations).join('\n')}\n\nMultiple matches — ask fanId.`
    return finalizeLookupToolReturn(appendLookupMetaBlock(content, meta), uiActions, meta)
  }

  const broad = await loadDivineDmConversations(supabase, userId, { limit: 80, query: '' })
  if (broad.conversations.length > 0) {
    await upsertFanRecentsFromConversations(supabase, userId, broad.conversations)
  }
  const ranked = rankConversationsByQuery(rawQuery, broad.conversations, 8)
  content += `Matches from OnlyFans:\n(none for strict query)\n`

  if (ranked.length === 0) {
    const meta: DivineLookupMeta = {
      tool: 'lookup_fan',
      heard_query: rawQuery,
      resolved: 'no_match',
      candidates: [],
      dedupe_key: buildDedupeKey(rawQuery, []),
      next_step_hint: 'No match. Ask to retype username or fan id. Do not repeat lookup_fan with the same query.',
    }
    content += `No fans matched "${rawQuery}" in cache or live list after fuzzy scan.`
    return finalizeLookupToolReturn(appendLookupMetaBlock(content, meta), uiActions, meta)
  }

  const best = ranked[0]!
  const second = ranked[1]
  if (best.score >= 0.78 && (!second || second.score < 0.52)) {
    const cands = toCandidates([best])
    const meta: DivineLookupMeta = {
      tool: 'lookup_fan',
      heard_query: rawQuery,
      resolved: 'fuzzy_confirm_required',
      candidates: cands,
      dedupe_key: buildDedupeKey(rawQuery, cands),
      next_step_hint: 'Confirm fuzzy best before ui_focus_fan. Do not repeat lookup_fan.',
    }
    const label = best.row.name ? `${best.row.name} (@${best.row.username})` : `@${best.row.username}`
    content += `Closest fuzzy match: ${label} [fanId: ${best.row.fanId}] (~${(best.score * 100).toFixed(0)}%). Ask to confirm.`
    return finalizeLookupToolReturn(appendLookupMetaBlock(content, meta), uiActions, meta)
  }

  const top3 = ranked.slice(0, 3)
  const cands = toCandidates(top3)
  const meta: DivineLookupMeta = {
    tool: 'lookup_fan',
    heard_query: rawQuery,
    resolved: 'fuzzy_ambiguous',
    candidates: cands,
    dedupe_key: buildDedupeKey(rawQuery, cands),
    next_step_hint: 'Offer 1–3 options with fanIds. Do not repeat lookup_fan.',
  }
  content += `Possible fuzzy matches — ask which fan or fan id.`
  return finalizeLookupToolReturn(appendLookupMetaBlock(content, meta), uiActions, meta)
}

export async function runContextTool(
  name: string,
  args: Record<string, unknown>,
  cookie: string,
  ctx?: DivineContext,
): Promise<string> {
  try {
    if (name === 'run_leak_scan') {
      if (!ctx) return 'Leak scan is unavailable in this context.'
      const aliases = Array.isArray(args.aliases)
        ? (args.aliases as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        : []
      const former_usernames = Array.isArray(args.former_usernames)
        ? (args.former_usernames as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        : []
      const title_hints = Array.isArray(args.title_hints)
        ? (args.title_hints as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        : []
      const urls = Array.isArray(args.urls)
        ? (args.urls as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        : []
      const strict = args.strict !== false
      const include_content_titles = args.include_content_titles !== false
      const payload = { aliases, former_usernames, title_hints, include_content_titles, urls, strict }
      const { ok: divineFull } = await isDivineFullAccess(ctx.supabase, ctx.userId)
      if (divineFull) {
        void runLeakScan(ctx.supabase, {
          userId: ctx.userId,
          ...payload,
        }).catch((e) => console.warn('[run_leak_scan background]', e))
        return `Leak scan queued in the background (Divine full). Open Protection in a minute for new alerts.`
      }
      const result = await runLeakScan(ctx.supabase, {
        userId: ctx.userId,
        ...payload,
      })
      if (!result.success) {
        return `Leak scan failed: ${result.message ?? 'unknown error'}`
      }
      return [
        `Leak scan finished.`,
        `New alerts inserted: ${result.inserted}.`,
        `Skipped (already listed or not new): ${result.skipped}.`,
        `Filtered out by strict mode: ${result.filteredStrict}.`,
        result.message ? `Note: ${result.message}` : '',
        `Web search provider: ${result.providerConfigured ? 'configured' : 'not configured'}.`,
        result.grokEnrichment ? 'Grok enrichment available on Pro.' : '',
        typeof result.pageVerifyCount === 'number' && result.pageVerifyCount > 0
          ? `Critical/high pages re-checked: ${result.pageVerifyCount}.`
          : '',
      ]
        .filter(Boolean)
        .join(' ')
    }
    if (name === 'analyze_image_from_url') {
      if (!ctx) return 'Context unavailable.'
      const { ok: divineFull } = await isDivineFullAccess(ctx.supabase, ctx.userId)
      if (!divineFull) return DIVINE_FULL_UPGRADE_MESSAGE
      const rawUrl = typeof args.url === 'string' ? args.url.trim() : ''
      if (!rawUrl.startsWith('http')) return 'Provide a valid http(s) URL.'
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const allowedHost =
        rawUrl.includes('/storage/v1/object') ||
        (supabaseUrl.length > 0 && rawUrl.startsWith(supabaseUrl)) ||
        rawUrl.includes('.supabase.co')
      if (!allowedHost) {
        return 'Only Supabase storage or project-hosted image URLs are allowed for vision analysis.'
      }
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) return 'Vision is unavailable (API key missing).'
      const visionRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 500,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Describe this image briefly for a creator content manager: subject, quality, suitability for fan platforms, any concerns.',
                },
                { type: 'image_url', image_url: { url: rawUrl, detail: 'low' } },
              ],
            },
          ],
        }),
      })
      if (!visionRes.ok) {
        const t = await visionRes.text()
        return `Vision request failed: ${t.slice(0, 200)}`
      }
      const vj = (await visionRes.json()) as { choices?: Array<{ message?: { content?: string } }> }
      const text = vj.choices?.[0]?.message?.content ?? ''
      return text.slice(0, 1200) || 'No description returned.'
    }
    if (name === 'get_dm_thread') {
      if (!ctx) return 'Context unavailable.'
      const fanId = args.fanId
      if (!fanId) return 'fanId is required.'
      const out = await loadDivineDmThread(ctx.supabase, ctx.userId, String(fanId), 50)
      if (!out.ok) {
        if (out.notFound) return out.error || `This fan's thread is no longer available on OnlyFans.`
        if (out.error === 'OnlyFans not connected') {
          return 'OnlyFans is not connected. Connect OnlyFans in Settings → Integrations.'
        }
        return out.error
      }
      const thread = out.thread.slice(-40).map((m) => `${m.from}: ${m.text.slice(0, 400)}`)
      return thread.length ? `Thread:\n${thread.join('\n')}` : 'No messages in thread.'
    }
    if (name === 'get_reply_suggestions') {
      if (!ctx) return 'Context unavailable.'
      const fanId = args.fanId
      if (!fanId) return 'fanId is required.'
      const data = await fetchDmReplySuggestionsPackage(ctx.supabase, ctx.userId, { fanId: String(fanId) })
      return formatDmReplyToolText('get_reply_suggestions', data)
    }
    if (name === 'draft_fan_reply') {
      if (!ctx) return 'Context unavailable.'
      const fanId = args.fanId
      if (!fanId) return 'fanId is required.'
      const { data: st } = await ctx.supabase
        .from('divine_manager_settings')
        .select('mimic_profile')
        .eq('user_id', ctx.userId)
        .maybeSingle()
      const result = await draftFanReplyWithMimic({
        supabase: ctx.supabase,
        userId: ctx.userId,
        fanId: String(fanId),
        mimicRaw: (st as { mimic_profile?: unknown } | null)?.mimic_profile,
      })
      if (!result.ok) return result.error
      return `${result.text}\n\n— ${result.note}`
    }
    if (name === 'get_dm_thread_and_suggestions') {
      if (!ctx) return 'Context unavailable.'
      const fanId = args.fanId
      if (!fanId) return 'fanId is required.'
      const pkg = await fetchDmReplySuggestionsPackage(ctx.supabase, ctx.userId, { fanId: String(fanId) })
      return formatDmReplyToolText('get_dm_thread_and_suggestions', pkg)
    }
    if (name === 'list_leak_alerts') {
      if (!ctx) return 'Context unavailable.'
      const lim = typeof args.limit === 'number' ? Math.min(args.limit, 25) : 12
      const { data: rows, error } = await ctx.supabase
        .from('leak_alerts')
        .select('id, source_url, severity, user_case_status, ai_nuance_summary, detected_at')
        .eq('user_id', ctx.userId)
        .order('detected_at', { ascending: false })
        .limit(lim)
      if (error) return error.message
      if (!rows?.length) return 'No leak alerts yet.'
      return (rows as Array<Record<string, unknown>>)
        .map(
          (r) =>
            `- ${String(r.severity)} | ${String(r.user_case_status ?? 'open')} | ${String(r.source_url).slice(0, 80)}… ${r.ai_nuance_summary ? `(${String(r.ai_nuance_summary).slice(0, 120)})` : ''}`,
        )
        .join('\n')
    }
    if (name === 'update_leak_alert_case') {
      if (!ctx) return 'Context unavailable.'
      const alertId = typeof args.alertId === 'string' ? args.alertId : ''
      if (!alertId) return 'alertId required.'
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (typeof args.user_case_status === 'string') patch.user_case_status = args.user_case_status
      if (args.snooze_until !== undefined) {
        if (args.snooze_until === null) patch.snooze_until = null
        else if (typeof args.snooze_until === 'string') patch.snooze_until = new Date(args.snooze_until).toISOString()
      }
      if (typeof args.creator_distribution_intent === 'string') {
        patch.creator_distribution_intent = args.creator_distribution_intent
      }
      const { error } = await ctx.supabase
        .from('leak_alerts')
        .update(patch)
        .eq('id', alertId)
        .eq('user_id', ctx.userId)
      return error ? error.message : 'Leak alert updated.'
    }
    if (name === 'trigger_reputation_briefing') {
      if (!ctx) return 'Context unavailable.'
      const pro = await isProPlanUser(ctx.supabase, ctx.userId)
      if (!pro) return 'Venus Pro required for AI reputation briefing.'
      const handles = parseHandlesArg(args.handles)
      const result = await runReputationBriefingCore(ctx.supabase, ctx.userId, {
        handles: handles.length ? handles : undefined,
      })
      if (!result.ok) return result.error
      return result.message ?? 'Reputation briefing generated and saved. Open Mentions to read it.'
    }
    if (name === 'run_reputation_scan') {
      if (!ctx) return 'Context unavailable.'
      const modeRaw = typeof args.mode === 'string' ? args.mode : 'both'
      const mode = modeRaw === 'wide' || modeRaw === 'social' || modeRaw === 'both' ? modeRaw : 'both'
      const handles = parseHandlesArg(args.handles)
      const limitPerQuery =
        typeof args.limitPerQuery === 'number' ? Math.min(Math.max(args.limitPerQuery, 1), 50) : undefined
      const res = await runReputationScanCore(ctx.supabase, ctx.userId, {
        mode,
        handles: handles.length ? handles : undefined,
        limitPerQuery,
      })
      if (!res.ok) return res.error
      return [
        `Reputation scan complete (mode ${res.mode}).`,
        `Inserted: ${res.inserted}, skipped: ${res.skipped}.`,
        `By channel — web_wide: ${res.insertedByChannel.web_wide}, social: ${res.insertedByChannel.social}.`,
        `Grok-enriched: ${res.enriched}. Pro pipeline: ${res.pro ? 'yes' : 'no'}.`,
      ].join(' ')
    }
    if (name === 'add_reputation_identity') {
      if (!ctx) return 'Context unavailable.'
      const handles = parseHandlesArg(args.handles)
      const r = await addReputationManualHandles(ctx.supabase, ctx.userId, handles)
      return r.ok ? `Updated reputation handles. Now: ${r.handles.join(', ') || '(none)'}` : r.error
    }
    if (name === 'remove_reputation_identity') {
      if (!ctx) return 'Context unavailable.'
      const handles = parseHandlesArg(args.handles)
      const r = await removeReputationManualHandles(ctx.supabase, ctx.userId, handles)
      return r.ok ? `Removed handle(s). Remaining: ${r.handles.join(', ') || '(none)'}` : r.error
    }
    if (name === 'add_leak_search_identity') {
      if (!ctx) return 'Context unavailable.'
      const former = parseHandlesArg(args.former_usernames)
      const hints = parseTitleHintsArg(args.leak_search_title_hints)
      const r = await addLeakSearchIdentities(ctx.supabase, ctx.userId, former, hints)
      return r.ok ? 'Added leak/DMCA search identities (former usernames and/or title hints).' : r.error
    }
    if (name === 'remove_leak_search_identity') {
      if (!ctx) return 'Context unavailable.'
      const former = parseHandlesArg(args.former_usernames)
      const hints = parseTitleHintsArg(args.leak_search_title_hints)
      const r = await removeLeakSearchIdentities(ctx.supabase, ctx.userId, former, hints)
      return r.ok ? 'Removed leak/DMCA search identities where matched.' : r.error
    }
    if (name === 'get_fan_thread_insights') {
      if (!ctx) return 'Context unavailable.'
      const fanId = typeof args.fanId === 'string' ? args.fanId.trim() : ''
      if (!fanId) return 'fanId is required.'
      const [{ data: ins }, { data: sum }] = await Promise.all([
        ctx.supabase
          .from('fan_thread_insights')
          .select(
            'thread_snapshot_text, reply_package_hash, updated_at, profile_json, iteration, last_thread_refresh_at, profile_history',
          )
          .eq('user_id', ctx.userId)
          .eq('platform_fan_id', fanId)
          .maybeSingle(),
        ctx.supabase
          .from('fan_ai_summaries')
          .select('summary_json, status, last_analyzed_at, updated_at')
          .eq('user_id', ctx.userId)
          .eq('platform_fan_id', fanId)
          .maybeSingle(),
      ])
      const lines: string[] = []
      const row = ins as {
        thread_snapshot_text?: string | null
        updated_at?: string | null
        profile_json?: unknown
        iteration?: number | null
        last_thread_refresh_at?: string | null
        profile_history?: unknown
      } | null
      if (row?.thread_snapshot_text) {
        lines.push(`Thread snapshot (iteration ${row.iteration ?? 0}, updated ${row.updated_at ?? row.last_thread_refresh_at ?? 'unknown'}): ${String(row.thread_snapshot_text).slice(0, 3500)}`)
      } else {
        lines.push('No stored thread snapshot yet (run refresh_fan_thread_scan or get_reply_suggestions).')
      }
      if (row?.profile_json && typeof row.profile_json === 'object') {
        lines.push(`Fan personality profile (merged): ${JSON.stringify(row.profile_json).slice(0, 2500)}`)
      }
      if (sum?.summary_json) {
        lines.push(`Fan AI summary (OnlyFans): ${JSON.stringify(sum.summary_json).slice(0, 2000)}`)
      }
      return lines.join('\n\n')
    }
    if (name === 'refresh_fan_thread_scan') {
      if (!ctx) return 'Context unavailable.'
      const fanId = typeof args.fanId === 'string' ? args.fanId.trim() : ''
      if (!fanId) return 'fanId is required.'
      const force = args.force === true
      const r = await refreshFanThreadInsight(ctx.supabase, ctx.userId, fanId, {
        force,
        skipDebounce: true,
      })
      if (!r.ok) return r.error
      return r.skipped
        ? 'Thread refresh skipped (debounced—try again shortly or use force in app).'
        : `Thread snapshot updated (iteration ${r.iteration ?? 0}). ${r.profileUpdated ? 'Personality profile refreshed.' : ''}`
    }
    if (name === 'get_reputation_briefing') {
      if (!ctx) return 'Context unavailable.'
      const { data: row, error } = await ctx.supabase
        .from('profiles')
        .select('reputation_briefing, reputation_briefing_at')
        .eq('id', ctx.userId)
        .maybeSingle()
      if (error) return error.message
      const at = (row as { reputation_briefing_at?: string | null })?.reputation_briefing_at
      const briefing = (row as { reputation_briefing?: unknown })?.reputation_briefing
      if (!briefing) return 'No reputation briefing saved yet. Use trigger_reputation_briefing or Mentions.'
      return `Last updated: ${at ?? 'unknown'}\n${JSON.stringify(briefing).slice(0, 3500)}`
    }
    if (name === 'list_reputation_briefings') {
      if (!ctx) return 'Context unavailable.'
      const lim = typeof args.limit === 'number' ? Math.min(Math.max(args.limit, 1), 20) : 8
      const { data: rows, error } = await ctx.supabase
        .from('reputation_briefing_history')
        .select('briefing_json, created_at')
        .eq('user_id', ctx.userId)
        .order('created_at', { ascending: false })
        .limit(lim)
      if (error) return error.message.includes('relation') ? 'Briefing history is not available (run DB migration).' : error.message
      if (!rows?.length) return 'No briefing history yet.'
      return (rows as Array<{ created_at?: string; briefing_json?: unknown }>)
        .map((r, i) => `${i + 1}. ${r.created_at ?? '?'} — ${JSON.stringify(r.briefing_json).slice(0, 400)}…`)
        .join('\n')
    }
    if (name === 'list_reputation_mentions') {
      if (!ctx) return 'Context unavailable.'
      const lim = typeof args.limit === 'number' ? Math.min(args.limit, 30) : 15
      const { data: rows, error } = await ctx.supabase
        .from('reputation_mentions')
        .select('id, source_url, platform, sentiment, content_preview, detected_at, ai_recommended_action')
        .eq('user_id', ctx.userId)
        .order('detected_at', { ascending: false })
        .limit(lim)
      if (error) return error.message
      if (!rows?.length) return 'No reputation mentions yet.'
      return (rows as Array<Record<string, unknown>>)
        .map(
          (r) =>
            `- [${String(r.platform)}] ${String(r.sentiment)} | ${String(r.content_preview ?? '').slice(0, 100)}…`,
        )
        .join('\n')
    }
    if (name === 'get_integrations_summary') {
      if (!ctx) return 'Context unavailable.'
      const [snapshot, { data: sp }] = await Promise.all([
        getPlatformConnectionSnapshot(ctx.supabase, ctx.userId),
        ctx.supabase.from('social_profiles').select('platform, username').eq('user_id', ctx.userId),
      ])
      const lines: string[] = []
      lines.push(
        snapshot.onlyfansConnected
          ? `- onlyfans: CONNECTED${snapshot.onlyfansUsername ? ` (@${snapshot.onlyfansUsername})` : ''}`
          : '- onlyfans: NOT CONNECTED',
      )
      lines.push(
        snapshot.fanslyConnected
          ? `- fansly: CONNECTED${snapshot.fanslyUsername ? ` (@${snapshot.fanslyUsername})` : ''}`
          : '- fansly: NOT CONNECTED',
      )
      for (const s of sp || []) {
        lines.push(`- social_profiles ${(s as { platform?: string }).platform}: @${(s as { username?: string }).username}`)
      }
      lines.push(
        'If a platform is NOT CONNECTED, open /dashboard/settings?tab=integrations before using fan lookup, DMs, or live platform analytics.',
      )
      return `Integrations summary:\n${lines.join('\n')}`
    }
    if (name === 'get_scheduled_content_summary' || name === 'list_cosmic_calendar') {
      if (!ctx) return 'Context unavailable.'
      const lim = typeof args.limit === 'number' ? Math.min(args.limit, 30) : 15
      const { data: rows, error } = await ctx.supabase
        .from('content')
        .select('title, scheduled_at, status')
        .eq('user_id', ctx.userId)
        .eq('status', 'scheduled')
        .order('scheduled_at', { ascending: true })
        .limit(lim)
      if (error) return error.message
      if (!rows?.length) return 'No scheduled content.'
      return (rows as Array<{ title?: string; scheduled_at?: string }>)
        .map((r) => `- ${r.title ?? 'Untitled'} @ ${r.scheduled_at ?? 'TBD'}`)
        .join('\n')
    }
    if (name === 'list_content') {
      if (!ctx) return 'Context unavailable.'
      const limit = typeof args.limit === 'number' ? Math.min(Math.max(args.limit, 1), 50) : 20
      const status = typeof args.status === 'string' ? args.status : ''
      let query = ctx.supabase
        .from('content')
        .select('id, title, status, scheduled_at, created_at')
        .eq('user_id', ctx.userId)
        .order('scheduled_at', { ascending: true, nullsFirst: false })
        .limit(limit)
      if (status) query = query.eq('status', status)
      const { data: rows, error } = await query
      if (error) return error.message
      const list = (rows ?? []).map((c: { title?: string; status?: string; scheduled_at?: string | null }) => {
        const title = c.title?.trim() || 'Untitled'
        const when = c.scheduled_at ? ` (${c.scheduled_at})` : ''
        return `[${c.status ?? 'unknown'}] ${title}${when}`
      })
      return list.length ? `Content:\n${list.join('\n')}` : 'No content found.'
    }
    if (name === 'list_vault_for_dm') {
      if (!ctx) return 'Context unavailable.'
      const limit = typeof args.limit === 'number' ? Math.min(Math.max(args.limit, 1), 50) : 25
      const { data: rows, error } = await ctx.supabase
        .from('content')
        .select(
          'id, title, description, content_type, status, scheduled_at, thumbnail_url, file_url, sales_notes, teaser_tags, spoiler_level',
        )
        .eq('user_id', ctx.userId)
        .order('updated_at', { ascending: false })
        .limit(limit)
      if (error) {
        const { data: rows2, error: err2 } = await ctx.supabase
          .from('content')
          .select('id, title, description, content_type, status, scheduled_at, thumbnail_url, file_url')
          .eq('user_id', ctx.userId)
          .order('updated_at', { ascending: false })
          .limit(limit)
        if (err2) return err2.message
        const list = (rows2 ?? []).map((c: Record<string, unknown>) =>
          JSON.stringify({
            id: c.id,
            title: c.title,
            type: c.content_type,
            status: c.status,
            scheduled_at: c.scheduled_at,
            has_thumb: Boolean(c.thumbnail_url || c.file_url),
            description: typeof c.description === 'string' ? String(c.description).slice(0, 200) : null,
          }),
        )
        return list.length ? `Vault (Creatix content):\n${list.join('\n')}` : 'No vault items yet.'
      }
      const list = (rows ?? []).map((c: Record<string, unknown>) =>
        JSON.stringify({
          id: c.id,
          title: c.title,
          type: c.content_type,
          status: c.status,
          scheduled_at: c.scheduled_at,
          has_thumb: Boolean(c.thumbnail_url || c.file_url),
          sales_notes: typeof c.sales_notes === 'string' ? String(c.sales_notes).slice(0, 400) : null,
          teaser_tags: c.teaser_tags,
          spoiler_level: c.spoiler_level,
        }),
      )
      return list.length ? `Vault for DMs (id, notes, tags):\n${list.join('\n')}` : 'No vault items yet.'
    }
    if (name === 'get_content_sales_metadata') {
      if (!ctx) return 'Context unavailable.'
      const contentId = typeof args.content_id === 'string' ? args.content_id.trim() : ''
      if (!contentId) return 'content_id is required.'
      const { data: row, error } = await ctx.supabase
        .from('content')
        .select(
          'id, title, description, content_type, status, scheduled_at, sales_notes, teaser_tags, spoiler_level',
        )
        .eq('id', contentId)
        .eq('user_id', ctx.userId)
        .maybeSingle()
      if (error) {
        const { data: row2, error: err2 } = await ctx.supabase
          .from('content')
          .select('id, title, description, content_type, status, scheduled_at')
          .eq('id', contentId)
          .eq('user_id', ctx.userId)
          .maybeSingle()
        if (err2) return err2.message
        if (!row2) return 'Content not found for this creator.'
        return JSON.stringify({
          ...row2,
          sales_notes: null,
          teaser_tags: null,
          spoiler_level: null,
          hint: 'Run migration 033 for sales_notes / teaser_tags / spoiler_level columns.',
        })
      }
      if (!row) return 'Content not found for this creator.'
      const r = row as Record<string, unknown>
      return JSON.stringify({
        id: r.id,
        title: r.title,
        type: r.content_type,
        status: r.status,
        scheduled_at: r.scheduled_at,
        description:
          typeof r.description === 'string' ? String(r.description).slice(0, 400) : null,
        sales_notes:
          typeof r.sales_notes === 'string' ? String(r.sales_notes).slice(0, 2000) : r.sales_notes ?? null,
        teaser_tags: r.teaser_tags ?? null,
        spoiler_level: r.spoiler_level ?? null,
      })
    }
    if (name === 'get_task_status') {
      if (!ctx) return 'Context unavailable.'
      const mem = await getVoiceMemoryPayload(ctx.supabase, ctx.userId)
      const tasks = mem.tasks ?? []
      const nav = mem.navigation
      const summary = [
        `tasks: ${JSON.stringify(
          tasks.map((t) => ({ id: t.id, kind: t.kind, status: t.status, fanId: t.fanId, error: t.error })),
        )}`,
        `navigation: ${JSON.stringify(nav)}`,
      ].join('\n')
      return summary.slice(0, 3800)
    }
  } catch (e) {
    return e instanceof Error ? e.message : 'Request failed'
  }
  return 'Unknown context tool.'
}

/** Same shape as POST /api/divine/intent (tool args + intent `type` last). */
function buildIntentRequestBody(intentType: string, args: Record<string, unknown>): Record<string, unknown> {
  const body: Record<string, unknown> = { ...args, type: intentType }
  if (intentType === 'get_message_engagement' && (args.type === 'direct' || args.type === 'mass')) {
    body.channel = args.type
  }
  if (intentType === 'create_task' && args.summary) {
    body.payload = { type: (args as { type?: string }).type ?? 'content_idea', summary: args.summary }
    body.summary = args.summary
  }
  return body
}

export async function runIntent(
  type: string,
  args: Record<string, unknown>,
  cookie: string,
  ctx?: { supabase: SupabaseClient },
): Promise<{
  status: string
  intent_id?: string
  summary?: string
  message?: string
  success?: boolean
  error?: string
}> {
  const body = buildIntentRequestBody(type, args) as IntentBody

  if (ctx?.supabase) {
    const {
      data: { user },
    } = await ctx.supabase.auth.getUser()
    if (!user) {
      return { status: 'failed', error: 'Unauthorized' }
    }
    const result = await executeDivineIntentPost(ctx.supabase, user, body)
    if (result.status >= 400) {
      const err = typeof result.body.error === 'string' ? result.body.error : `HTTP ${result.status}`
      return { status: 'failed', error: err, ...result.body }
    }
    return result.body as {
      status: string
      intent_id?: string
      summary?: string
      message?: string
      success?: boolean
      error?: string
    }
  }

  const base = getBaseUrl()
  let res: Response
  try {
    res = await fetch(`${base}/api/divine/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(body),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'fetch failed'
    return { status: 'failed', error: `Intent request failed: ${msg}` }
  }

  const text = await res.text()
  let data: Record<string, unknown> = {}
  if (text.trim()) {
    try {
      data = JSON.parse(text) as Record<string, unknown>
    } catch {
      return {
        status: 'failed',
        error: `Intent response was not JSON (${res.status}). Body: ${text.slice(0, 200)}`,
      }
    }
  } else if (!res.ok) {
    return { status: 'failed', error: `Intent request failed (${res.status}) with empty body.` }
  } else {
    return { status: 'failed', error: 'Intent returned 200 with empty body (unexpected).' }
  }

  if (!res.ok) {
    const err = typeof data.error === 'string' ? data.error : `HTTP ${res.status}`
    return { status: 'failed', error: err, ...data }
  }

  return data as {
    status: string
    intent_id?: string
    summary?: string
    message?: string
    success?: boolean
    error?: string
  }
}

export type ToolCallPart = { id: string; function: { name: string; arguments: string } }

type PendingConf = Array<{ type: string; intent_id: string; summary?: string }>

async function runPrepareDmUiResult(
  tc: ToolCallPart,
  args: Record<string, unknown>,
  supabase: SupabaseClient,
  userId: string,
): Promise<{
  tool_call_id: string
  content: string
  pendingConfirmations: PendingConf
  uiActions: DivineUiAction[]
  lookupMeta?: DivineLookupMeta | null
}> {
  const emptyPending: PendingConf = []
  const fanId = typeof args.fanId === 'string' ? args.fanId.trim() : ''
  const msg =
    (typeof args.message === 'string' && args.message) ||
    (typeof args.text === 'string' && args.text) ||
    ''
  const mediaIds = Array.isArray(args.mediaIds)
    ? args.mediaIds.map((x) => String(x)).filter(Boolean).slice(0, 12)
    : undefined
  if (!fanId) {
    return {
      tool_call_id: tc.id,
      content: 'fanId is required.',
      pendingConfirmations: emptyPending,
      uiActions: [],
    }
  }
  if (!msg.trim() && !(mediaIds && mediaIds.length > 0)) {
    return {
      tool_call_id: tc.id,
      content: 'message text or mediaIds is required for a DM draft.',
      pendingConfirmations: emptyPending,
      uiActions: [],
    }
  }
  const settings = await getSettings(supabase, userId)
  const dmMode = settings?.automation_rules?.dm_focus_mode ?? 'navigate'
  const presentation = dmMode === 'overlay' ? 'overlay' : 'navigate'
  const defaultDelay = settings?.automation_rules?.divine_send_delay_ms
  let delayMs =
    typeof args.delayMs === 'number' && !Number.isNaN(args.delayMs)
      ? Math.max(0, Math.min(120_000, Math.floor(args.delayMs)))
      : typeof defaultDelay === 'number'
        ? Math.max(0, Math.min(120_000, Math.floor(defaultDelay)))
        : 3000
  if (args.schedule === false || args.auto_send === false) {
    delayMs = 0
  }
  const price = typeof args.price === 'number' && !Number.isNaN(args.price) ? args.price : undefined
  const text = msg.trim()
  const actions: DivineUiAction[] = [{ type: 'focus_fan', fanId, presentation }]
  if (text) {
    actions.push({
      type: 'show_divine_transcript',
      text: text.slice(0, DIVINE_TRANSCRIPT_MAX),
      title: 'DM draft',
    })
    actions.push({
      type: 'set_dm_composer',
      fanId,
      text,
      replace: true,
      mediaIds,
      price: price ?? null,
    })
  } else if (mediaIds?.length) {
    actions.push({
      type: 'set_dm_composer',
      fanId,
      text: '',
      replace: true,
      mediaIds,
      price: price ?? null,
    })
  }
  if (delayMs > 0 && (text || (mediaIds?.length ?? 0) > 0)) {
    actions.push({ type: 'schedule_dm_send', fanId, delayMs })
  }
  return {
    tool_call_id: tc.id,
    content: `Draft in the message box for fan ${fanId}.${delayMs > 0 ? ` Auto-send in ${Math.round(delayMs / 1000)}s unless you cancel.` : ' Send manually when ready.'}`,
    pendingConfirmations: emptyPending,
    uiActions: actions,
  }
}

export async function runToolCall(
  tc: ToolCallPart,
  opts: {
    cookie: string
    supabase: SupabaseClient
    userId: string
    divineFull: boolean
  },
): Promise<{
  tool_call_id: string
  content: string
  pendingConfirmations: Array<{ type: string; intent_id: string; summary?: string }>
  uiActions: DivineUiAction[]
  lookupMeta?: DivineLookupMeta | null
}> {
  const { cookie, supabase, userId } = opts
  const name = tc.function.name
  let args: Record<string, unknown> = {}
  try {
    args = JSON.parse(tc.function.arguments || '{}') as Record<string, unknown>
  } catch {
    args = {}
  }

  const emptyPending: Array<{ type: string; intent_id: string; summary?: string }> = []
  const uiActions: DivineUiAction[] = []

  if (name === 'voice_allow_user_hangup') {
    return {
      tool_call_id: tc.id,
      content:
        'Manual hangup is enabled. The creator can tap End call when they are ready. Say goodbye, then call end_call when they finish.',
      pendingConfirmations: emptyPending,
      uiActions: [{ type: 'voice_set_hangup', allowed: true }],
    }
  }

  if (name === 'ui_navigate') {
    const path = typeof args.path === 'string' ? args.path : ''
    if (!isAllowedUiNavigatePath(path)) {
      return {
        tool_call_id: tc.id,
        content: 'That path is not available for in-app navigation. Use a listed dashboard route (Divine Manager may use ?section=mimic|voice|tasks|alerts).',
        pendingConfirmations: emptyPending,
        uiActions,
      }
    }
    uiActions.push({ type: 'navigate', path })
    return {
      tool_call_id: tc.id,
      content: `Opening ${path} in the app.`,
      pendingConfirmations: emptyPending,
      uiActions,
    }
  }

  if (name === 'ui_focus_fan') {
    const fanId = typeof args.fanId === 'string' ? args.fanId : ''
    if (!fanId.trim()) {
      return { tool_call_id: tc.id, content: 'fanId is required.', pendingConfirmations: emptyPending, uiActions }
    }
    const settings = await getSettings(supabase, userId)
    const mode = settings?.automation_rules?.dm_focus_mode ?? 'navigate'
    const presentation = mode === 'overlay' ? 'overlay' : 'navigate'
    uiActions.push({ type: 'focus_fan', fanId, presentation })
    return {
      tool_call_id: tc.id,
      content:
        presentation === 'overlay'
          ? `Opening DM overlay for fan ${fanId}.`
          : `Opening Messages and focusing fan ${fanId}.`,
      pendingConfirmations: emptyPending,
      uiActions,
    }
  }

  if (name === 'prepare_dm') {
    return runPrepareDmUiResult(tc, args, supabase, userId)
  }

  if (name === 'open_dm_overlay') {
    const fanId = typeof args.fanId === 'string' ? args.fanId.trim() : ''
    if (!fanId) {
      return { tool_call_id: tc.id, content: 'fanId is required.', pendingConfirmations: emptyPending, uiActions }
    }
    uiActions.push({ type: 'focus_fan', fanId, presentation: 'overlay' })
    return {
      tool_call_id: tc.id,
      content: `Opening DM overlay for fan ${fanId}.`,
      pendingConfirmations: emptyPending,
      uiActions,
    }
  }

  if (name === 'switch_overlay_fan') {
    const fanId = typeof args.fanId === 'string' ? args.fanId.trim() : ''
    if (!fanId) {
      return { tool_call_id: tc.id, content: 'fanId is required.', pendingConfirmations: emptyPending, uiActions }
    }
    uiActions.push({ type: 'switch_overlay_fan', fanId })
    return {
      tool_call_id: tc.id,
      content: `Switched overlay tab to fan ${fanId}.`,
      pendingConfirmations: emptyPending,
      uiActions,
    }
  }

  if (name === 'recommend_dm_bundle') {
    const settings = await getSettings(supabase, userId)
    const styleRaw =
      (typeof args.pricing_style === 'string' && args.pricing_style) ||
      (typeof settings?.automation_rules?.dm_pricing_style === 'string' &&
        settings.automation_rules.dm_pricing_style) ||
      'balanced'
    const style =
      styleRaw === 'maximize_revenue' || styleRaw === 'premium_domme' ? styleRaw : 'balanced'
    const bias =
      style === 'maximize_revenue'
        ? 'Bias: maximize PPV revenue; suggest assertive premium pricing where appropriate.'
        : style === 'premium_domme'
          ? 'Bias: premium dominance / findom-adjacent framing where platform-safe; consenting-adults only.'
          : 'Bias: balanced pricing for conversion and fan trust.'
    const goal = typeof args.goal === 'string' ? args.goal : ''
    const fanContext = typeof args.fan_context === 'string' ? args.fan_context : ''
    let contentRef = typeof args.content_summary === 'string' ? args.content_summary : ''
    const idList = Array.isArray(args.content_ids)
      ? args.content_ids.map((x) => String(x).trim()).filter(Boolean).slice(0, 12)
      : []
    if (idList.length) {
      let rows: Record<string, unknown>[] | null = null
      const q1 = await supabase
        .from('content')
        .select('id, title, content_type, status, sales_notes, teaser_tags, spoiler_level')
        .eq('user_id', userId)
        .in('id', idList)
      if (!q1.error && q1.data) {
        rows = q1.data as Record<string, unknown>[]
      } else {
        const q2 = await supabase
          .from('content')
          .select('id, title, content_type, status')
          .eq('user_id', userId)
          .in('id', idList)
        if (!q2.error && q2.data) rows = q2.data as Record<string, unknown>[]
      }
      if (rows?.length) {
        const vaultBlock = rows
          .map((r) =>
            JSON.stringify({
              id: r.id,
              title: r.title,
              type: r.content_type,
              status: r.status,
              sales_notes:
                typeof r.sales_notes === 'string' ? String(r.sales_notes).slice(0, 800) : r.sales_notes ?? null,
              teaser_tags: r.teaser_tags ?? null,
              spoiler_level: r.spoiler_level ?? null,
            }),
          )
          .join('\n')
        contentRef = [contentRef.trim(), `Vault items (ids + saved sales metadata):\n${vaultBlock}`]
          .filter((s) => s.length > 0)
          .join('\n\n')
      }
    }
    const out = await runAiStudioToolServer(
      'dm-bundle-pricing',
      {
        goal,
        fan_context: fanContext,
        content_summary: contentRef,
        pricing_style: style,
        pricing_bias: bias,
        platform: args.platform === 'fansly' ? 'fansly' : 'onlyfans',
        current_price: typeof args.current_price === 'number' ? args.current_price : undefined,
      },
      cookie,
    )
    const summary = out.success
      ? typeof out.result === 'object' && out.result !== null && 'content' in out.result
        ? String((out.result as { content: string }).content).slice(0, 1200)
        : JSON.stringify(out.result).slice(0, 1200)
      : (out.error ?? 'Tool failed')
    return { tool_call_id: tc.id, content: summary, pendingConfirmations: emptyPending, uiActions }
  }

  if (name === 'upsert_content_sales_notes') {
    const contentId = typeof args.content_id === 'string' ? args.content_id.trim() : ''
    if (!contentId) {
      return { tool_call_id: tc.id, content: 'content_id is required.', pendingConfirmations: emptyPending, uiActions }
    }
    const patch: Record<string, unknown> = {}
    if (typeof args.sales_notes === 'string') patch.sales_notes = args.sales_notes.slice(0, 8000)
    if (Array.isArray(args.teaser_tags)) {
      patch.teaser_tags = args.teaser_tags.map((t) => String(t).slice(0, 80)).filter(Boolean).slice(0, 40)
    }
    if (typeof args.spoiler_level === 'string') patch.spoiler_level = args.spoiler_level.slice(0, 32)
    if (Object.keys(patch).length === 0) {
      return {
        tool_call_id: tc.id,
        content: 'Provide sales_notes, teaser_tags, and/or spoiler_level.',
        pendingConfirmations: emptyPending,
        uiActions,
      }
    }
    const { error } = await supabase.from('content').update(patch).eq('id', contentId).eq('user_id', userId)
    return {
      tool_call_id: tc.id,
      content: error ? error.message : 'Saved content sales metadata.',
      pendingConfirmations: emptyPending,
      uiActions,
    }
  }

  if (name === 'run_ai_studio_tool') {
    const toolId = typeof args.toolId === 'string' ? args.toolId.trim() : ''
    const inner =
      typeof args.args === 'object' && args.args !== null && !Array.isArray(args.args)
        ? (args.args as Record<string, unknown>)
        : {}
    if (!toolId) {
      return {
        tool_call_id: tc.id,
        content: 'toolId is required (see AI Studio / lib/ai-tools-data ids).',
        pendingConfirmations: emptyPending,
        uiActions,
      }
    }
    const out = await runAiStudioToolServer(toolId, inner, cookie)
    const summary = out.success
      ? typeof out.result === 'object' && out.result !== null && 'content' in out.result
        ? String((out.result as { content: string }).content).slice(0, 800)
        : JSON.stringify(out.result).slice(0, 1200)
      : (out.error ?? 'Tool failed')
    return { tool_call_id: tc.id, content: summary, pendingConfirmations: emptyPending, uiActions }
  }

  if (name === 'start_thread_scan_async') {
    const fanId = typeof args.fanId === 'string' ? args.fanId.trim() : ''
    if (!fanId) {
      return { tool_call_id: tc.id, content: 'fanId is required.', pendingConfirmations: emptyPending, uiActions }
    }
    const r = await queueThreadScanBackgroundJob(supabase, userId, { fanId, openPanel: args.openPanel })
    if (!r.taskId) {
      return { tool_call_id: tc.id, content: r.message, pendingConfirmations: emptyPending, uiActions }
    }
    return {
      tool_call_id: tc.id,
      content: r.message,
      pendingConfirmations: emptyPending,
      uiActions: [{ type: 'navigate', path: '/dashboard/analytics' }],
    }
  }

  const isAITool = name in AI_TOOL_NAME_TO_ID
  const isContextTool = CONTEXT_TOOL_NAMES.has(name)

  if (isAITool) {
    const out = await runAITool(name, args, cookie)
    const summary = out.success
      ? typeof out.result === 'object' && out.result !== null && 'content' in out.result
        ? String((out.result as { content: string }).content).slice(0, 500)
        : JSON.stringify(out.result).slice(0, 500)
      : (out.error ?? 'Tool failed')
    return { tool_call_id: tc.id, content: summary, pendingConfirmations: emptyPending, uiActions }
  }

  if (name === 'get_reply_suggestions' || name === 'get_dm_thread_and_suggestions') {
    const fanId = typeof args.fanId === 'string' ? args.fanId.trim() : ''
    if (!fanId) {
      return { tool_call_id: tc.id, content: 'fanId is required.', pendingConfirmations: emptyPending, uiActions }
    }
    const openPanel = parseOpenPanelArg(args.openPanel)
    const highlightPanel = openPanelToHighlightPanel(openPanel)
    const pkg = await fetchDmReplySuggestionsPackage(supabase, userId, { fanId })
    const toolKey =
      name === 'get_reply_suggestions'
        ? ('get_reply_suggestions' as const)
        : ('get_dm_thread_and_suggestions' as const)
    const text = formatDmReplyToolText(toolKey, pkg)
    if ('error' in pkg && pkg.error) {
      return { tool_call_id: tc.id, content: text, pendingConfirmations: emptyPending, uiActions }
    }
    const show = buildShowDmReplySuggestionsAction(fanId, pkg, highlightPanel)
    const settingsDm = await getSettings(supabase, userId)
    const dmMode = settingsDm?.automation_rules?.dm_focus_mode ?? 'navigate'
    const presentation = dmMode === 'overlay' ? 'overlay' : 'navigate'
    const outActions: DivineUiAction[] = [{ type: 'focus_fan', fanId, presentation }]
    if (show) outActions.push(show)
    return {
      tool_call_id: tc.id,
      content: text.slice(0, 4000),
      pendingConfirmations: emptyPending,
      uiActions: outActions,
    }
  }

  if (name === 'get_dm_conversations') {
    const out = await runGetDmConversationsToolResult(supabase, userId, args)
    return {
      tool_call_id: tc.id,
      content: truncatePreservingLookupMeta(out.content, 4000),
      pendingConfirmations: emptyPending,
      uiActions: out.uiActions,
      lookupMeta: out.lookupMeta,
    }
  }
  if (name === 'lookup_fan') {
    const out = await runLookupFanToolResult(supabase, userId, args)
    return {
      tool_call_id: tc.id,
      content: truncatePreservingLookupMeta(out.content, 4000),
      pendingConfirmations: emptyPending,
      uiActions: out.uiActions,
      lookupMeta: out.lookupMeta,
    }
  }

  if (isContextTool) {
    const summary = await runContextTool(name, args, cookie, { supabase, userId })
    return { tool_call_id: tc.id, content: summary.slice(0, 4000), pendingConfirmations: emptyPending, uiActions }
  }

  let intentBody: Record<string, unknown> = { ...args }
  if (name === 'content_publish' && args.platforms) {
    intentBody.platforms = Array.isArray(args.platforms) ? args.platforms : [args.platforms]
  }
  if (name === 'mass_dm' && args.platforms) {
    intentBody.platforms = Array.isArray(args.platforms) ? args.platforms : [args.platforms]
  }
  if (name === 'send_message') {
    const msgRaw =
      (typeof args.message === 'string' && args.message) ||
      (typeof args.text === 'string' && args.text) ||
      (typeof args.body === 'string' && args.body) ||
      ''
    let platform: 'onlyfans' | 'fansly' = args.platform === 'fansly' ? 'fansly' : 'onlyfans'
    const fanIdArg = typeof args.fanId === 'string' ? args.fanId.trim() : ''
    // Voice often omits `platform`; infer from recents cache so we don't default to
    // onlyfans incorrectly when the focused fan is from fansly.
    if (args.platform == null && fanIdArg) {
      const { data: recent } = await supabase
        .from('divine_fan_recents')
        .select('platform')
        .eq('user_id', userId)
        .eq('fan_id', fanIdArg)
        .order('last_seen_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if ((recent as { platform?: string } | null)?.platform === 'fansly') {
        platform = 'fansly'
      }
    }
    intentBody.fanId = args.fanId
    intentBody.message = msgRaw
    intentBody.platform = platform
    intentBody.price = args.price
    intentBody.mediaIds = args.mediaIds
  }
  if (name === 'create_task') {
    intentBody = {
      summary: args.summary ?? 'Task',
      payload: { type: (args as { type?: string }).type ?? 'content_idea', summary: args.summary },
    }
  }

  const pendingConfirmations: Array<{ type: string; intent_id: string; summary?: string }> = []

  if (name === 'get_notifications') {
    const intentRes = await runIntent('get_notifications_summary', intentBody, cookie, { supabase })
    const summary = (intentRes.summary ?? intentRes.message ?? JSON.stringify(intentRes)).slice(0, 4000)
    return { tool_call_id: tc.id, content: summary, pendingConfirmations, uiActions }
  }
  if (name === 'list_notifications') {
    const intentRes = await runIntent('list_notifications', intentBody, cookie, { supabase })
    let summary = intentRes.summary ?? intentRes.message ?? JSON.stringify(intentRes)
    const r = intentRes as { notifications?: unknown[] }
    if (Array.isArray(r.notifications) && r.notifications.length) {
      summary += '\n' + JSON.stringify(r.notifications.slice(0, 25)).slice(0, 3000)
    }
    return { tool_call_id: tc.id, content: summary.slice(0, 6000), pendingConfirmations, uiActions }
  }
  if (name === 'mark_notifications_read') {
    const intentRes = await runIntent('mark_notifications_read', intentBody, cookie, { supabase })
    const summary = (intentRes.summary ?? intentRes.message ?? JSON.stringify(intentRes)).slice(0, 2000)
    return { tool_call_id: tc.id, content: summary, pendingConfirmations, uiActions }
  }

  /** Direct DB read — avoids server-to-server /api/divine/intent (cookie + Divine Manager "off" gate) and opens Analytics in-app. */
  if (name === 'get_stats') {
    const result = await getStats(supabase, userId, {
      period: typeof args.period === 'string' ? args.period : undefined,
      platform: typeof args.platform === 'string' ? args.platform : undefined,
    })
    await recordStatsTaskForBarrier(supabase, userId)
    return {
      tool_call_id: tc.id,
      content: result.summary.slice(0, 6000),
      pendingConfirmations: emptyPending,
      uiActions: [{ type: 'navigate', path: '/dashboard/analytics' }],
    }
  }

  if (name === 'send_message') {
    const modeRaw = typeof args.mode === 'string' ? args.mode.toLowerCase() : ''
    if (modeRaw === 'draft' || modeRaw === 'prepare') {
      return runPrepareDmUiResult(tc, args, supabase, userId)
    }
    const hasMedia = Array.isArray(args.mediaIds) && args.mediaIds.length > 0
    const m = typeof intentBody.message === 'string' ? intentBody.message.trim() : ''
    if (!m && !hasMedia) {
      return {
        tool_call_id: tc.id,
        content:
          'send_message was not run: message text is empty. Pass the exact text in the "message" argument (voice sometimes uses "text" — that is accepted too).',
        pendingConfirmations: emptyPending,
        uiActions,
      }
    }
  }

  const intentRes = await runIntent(name, intentBody, cookie, { supabase })
  let summary =
    intentRes.summary ??
    intentRes.message ??
    (typeof intentRes.error === 'string' ? intentRes.error : undefined) ??
    (intentRes.status && intentRes.status !== 'executed' ? `Intent status: ${intentRes.status}` : undefined) ??
    JSON.stringify(intentRes)
  const dataIntent = name as string
  if (dataIntent === 'list_fans' && Array.isArray((intentRes as { fans?: unknown[] }).fans)) {
    const fans = (intentRes as { fans: unknown[] }).fans
    summary += '\n' + JSON.stringify(fans.slice(0, 30)).slice(0, 3000)
  } else if (
    dataIntent === 'get_fan_subscription_history' &&
    Array.isArray((intentRes as { history?: unknown[] }).history)
  ) {
    summary += '\n' + JSON.stringify((intentRes as { history: unknown[] }).history).slice(0, 2000)
  } else if (
    dataIntent === 'list_followings' &&
    Array.isArray((intentRes as { followings?: unknown[] }).followings)
  ) {
    summary += '\n' + JSON.stringify((intentRes as { followings: unknown[] }).followings.slice(0, 20)).slice(0, 2000)
  } else if (dataIntent === 'get_top_message') {
    const r = intentRes as { message?: unknown; buyers?: unknown[] }
    if (r.message) summary += '\nMessage: ' + JSON.stringify(r.message).slice(0, 1000)
    if (Array.isArray(r.buyers) && r.buyers.length)
      summary += '\nBuyers: ' + JSON.stringify(r.buyers.slice(0, 15)).slice(0, 1500)
  } else if (
    dataIntent === 'get_message_engagement' &&
    ((intentRes as { messages?: unknown[] }).messages != null || (intentRes as { chart?: unknown[] }).chart != null)
  ) {
    const r = intentRes as { messages?: unknown[]; chart?: unknown[] }
    if (Array.isArray(r.messages) && r.messages.length)
      summary += '\nMessages: ' + JSON.stringify(r.messages.slice(0, 10)).slice(0, 2000)
    if (Array.isArray(r.chart) && r.chart.length)
      summary += '\nChart: ' + JSON.stringify(r.chart.slice(-14)).slice(0, 1500)
  }

  if (intentRes.status === 'requires_confirmation' && intentRes.intent_id) {
    pendingConfirmations.push({
      type: name,
      intent_id: intentRes.intent_id,
      summary: intentRes.summary,
    })
  }

  return { tool_call_id: tc.id, content: summary.slice(0, 6000), pendingConfirmations, uiActions }
}
