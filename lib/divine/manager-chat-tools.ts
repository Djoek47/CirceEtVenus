/**
 * Shared Divine Manager tool execution for chat and voice (single source of truth).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
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
import { loadDivineDmConversations } from '@/lib/divine/divine-dm-conversations'
import { loadDivineDmThread } from '@/lib/divine/divine-dm-thread'
import { isDivineFullAccess, DIVINE_FULL_UPGRADE_MESSAGE } from '@/lib/divine/divine-full-access'
import { draftFanReplyWithMimic } from '@/lib/divine/draft-fan-reply'

export const AI_TOOL_NAME_TO_ID: Record<string, string> = {
  analyze_content: 'standard-of-attraction',
  generate_caption: 'caption-generator',
  predict_viral: 'viral-predictor',
  get_retention_insights: 'churn-predictor',
  get_whale_advice: 'whale-whisperer',
}

/** Tools implemented in runContextTool (DB + internal helpers, not /api/divine/intent). */
export const CONTEXT_TOOL_NAMES = new Set<string>([
  'get_dm_conversations',
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
  'get_reputation_briefing',
  'list_reputation_briefings',
])

export type DivineUiAction = { type: 'navigate'; path: string } | { type: 'focus_fan'; fanId: string }

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
    if (name === 'get_dm_conversations') {
      if (!ctx) return 'Context unavailable.'
      const limit = typeof args.limit === 'number' ? Math.min(Math.max(args.limit, 1), 50) : 20
      const rawQuery = typeof args.query === 'string' ? args.query.trim() : ''
      const { conversations, message } = await loadDivineDmConversations(ctx.supabase, ctx.userId, {
        limit,
        query: rawQuery,
      })
      if (message === 'OnlyFans not connected') {
        return 'OnlyFans is not connected. Connect OnlyFans in Settings → Integrations.'
      }
      const list = conversations.slice(0, 15).map((c) => {
        const label = c.name ? `${c.name} (@${c.username})` : `@${c.username}`
        const last = c.lastMessage ?? ''
        return `${label} [id: ${c.fanId}]${c.unreadCount ? ` [${c.unreadCount} unread]` : ''}: ${last.slice(0, 60)}`
      })
      return list.length
        ? `Recent conversations (name, username, fanId, last message):\n${list.join('\n')}`
        : 'No recent conversations.'
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
      if ('error' in data && data.error) return data.error
      const rec = data.recommendation
        ? `Recommendation: ${data.recommendation.toUpperCase()}. ${data.recommendationReason ?? ''}`
        : ''
      const circe = (data.circeSuggestions ?? [])[0] ? `Circe: ${data.circeSuggestions![0].slice(0, 150)}...` : ''
      const venus = (data.venusSuggestions ?? [])[0] ? `Venus: ${data.venusSuggestions![0].slice(0, 150)}...` : ''
      const flirt = (data.flirtSuggestions ?? [])[0] ? `Flirt: ${data.flirtSuggestions![0].slice(0, 150)}...` : ''
      const ins =
        data.scan && typeof data.scan === 'object' && data.scan !== null && 'insights' in data.scan
          ? (data.scan as { insights?: string[] }).insights
          : undefined
      const scanLine = ins?.length ? `Scan: ${ins.slice(0, 2).join('; ')}` : ''
      return [scanLine, rec, circe, venus, flirt].filter(Boolean).join('\n') || 'No suggestions generated.'
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
      if ('error' in pkg && pkg.error) return pkg.error
      if ('message' in pkg && pkg.message === 'No messages in thread.') {
        return 'No messages in thread.'
      }
      const threadBlock = pkg.threadPreview ? `Thread:\n${pkg.threadPreview}` : ''
      const rec = pkg.recommendation
        ? `Recommendation: ${pkg.recommendation.toUpperCase()}. ${pkg.recommendationReason ?? ''}`
        : ''
      const circe = (pkg.circeSuggestions ?? [])[0] ? `Circe: ${pkg.circeSuggestions![0].slice(0, 150)}...` : ''
      const venus = (pkg.venusSuggestions ?? [])[0] ? `Venus: ${pkg.venusSuggestions![0].slice(0, 150)}...` : ''
      const flirt = (pkg.flirtSuggestions ?? [])[0] ? `Flirt: ${pkg.flirtSuggestions![0].slice(0, 150)}...` : ''
      const scan = pkg.scan as { insights?: string[]; riskFlags?: string[] } | null
      const scanLine = scan?.insights?.length ? `Scan: ${scan.insights.slice(0, 2).join('; ')}` : ''
      return [threadBlock, scanLine, rec, circe, venus, flirt].filter(Boolean).join('\n\n') || 'No suggestions.'
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
          .select('thread_snapshot_text, reply_package_hash, updated_at')
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
      if (ins?.thread_snapshot_text) {
        lines.push(`Thread snapshot (updated ${ins.updated_at ?? 'unknown'}): ${String(ins.thread_snapshot_text).slice(0, 3500)}`)
      } else {
        lines.push('No stored thread snapshot yet (run get_reply_suggestions for this fan).')
      }
      if (sum?.summary_json) {
        lines.push(`Fan AI summary: ${JSON.stringify(sum.summary_json).slice(0, 2000)}`)
      }
      return lines.join('\n\n')
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
      const [{ data: pc }, { data: sp }] = await Promise.all([
        ctx.supabase
          .from('platform_connections')
          .select('platform, platform_username, is_connected')
          .eq('user_id', ctx.userId)
          .eq('is_connected', true),
        ctx.supabase.from('social_profiles').select('platform, username').eq('user_id', ctx.userId),
      ])
      const lines: string[] = []
      for (const c of pc || []) {
        lines.push(`- ${(c as { platform?: string }).platform}: @${(c as { platform_username?: string }).platform_username}`)
      }
      for (const s of sp || []) {
        lines.push(`- social_profiles ${(s as { platform?: string }).platform}: @${(s as { username?: string }).username}`)
      }
      return lines.length ? `Connected:\n${lines.join('\n')}` : 'No OAuth connections in Integrations yet.'
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
  } catch (e) {
    return e instanceof Error ? e.message : 'Request failed'
  }
  return 'Unknown context tool.'
}

export async function runIntent(
  type: string,
  args: Record<string, unknown>,
  cookie: string,
): Promise<{ status: string; intent_id?: string; summary?: string; message?: string; success?: boolean }> {
  const base = getBaseUrl()
  const body: Record<string, unknown> = { type, ...args }
  if (type === 'create_task' && args.summary) {
    body.payload = { type: (args as { type?: string }).type ?? 'content_idea', summary: args.summary }
    body.summary = args.summary
  }
  const res = await fetch(`${base}/api/divine/intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  return data as { status: string; intent_id?: string; summary?: string; message?: string; success?: boolean }
}

export type ToolCallPart = { id: string; function: { name: string; arguments: string } }

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
    uiActions.push({ type: 'focus_fan', fanId })
    return {
      tool_call_id: tc.id,
      content: `Opening Messages and focusing fan ${fanId}.`,
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
    intentBody.fanId = args.fanId
    intentBody.message = args.message
    intentBody.platform = args.platform ?? 'onlyfans'
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
    const intentRes = await runIntent('get_notifications_summary', intentBody, cookie)
    const summary = (intentRes.summary ?? intentRes.message ?? JSON.stringify(intentRes)).slice(0, 4000)
    return { tool_call_id: tc.id, content: summary, pendingConfirmations, uiActions }
  }
  if (name === 'list_notifications') {
    const intentRes = await runIntent('list_notifications', intentBody, cookie)
    let summary = intentRes.summary ?? intentRes.message ?? JSON.stringify(intentRes)
    const r = intentRes as { notifications?: unknown[] }
    if (Array.isArray(r.notifications) && r.notifications.length) {
      summary += '\n' + JSON.stringify(r.notifications.slice(0, 25)).slice(0, 3000)
    }
    return { tool_call_id: tc.id, content: summary.slice(0, 6000), pendingConfirmations, uiActions }
  }
  if (name === 'mark_notifications_read') {
    const intentRes = await runIntent('mark_notifications_read', intentBody, cookie)
    const summary = (intentRes.summary ?? intentRes.message ?? JSON.stringify(intentRes)).slice(0, 2000)
    return { tool_call_id: tc.id, content: summary, pendingConfirmations, uiActions }
  }

  const intentRes = await runIntent(name, intentBody, cookie)
  let summary = intentRes.summary ?? intentRes.message ?? JSON.stringify(intentRes)
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
