/**
 * Shared Serper + insert pipeline for reputation discovery (HTTP route and briefing bootstrap).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { SerperProvider } from '@/lib/leaks/search-providers'
import { normalizeUrl, guessSourcePlatform } from '@/lib/leaks/url-utils'
import { enrichReputationWithGrok } from '@/lib/reputation/grok-enrichment'
import {
  buildDisplayNameQueries,
  buildSocialQueries,
  buildWideWebQueries,
  getReputationWideMaxQueries,
  type ScanChannel,
} from '@/lib/reputation/build-queries'
import { filterHandlesToAllowed, loadMergedHandlesForUser, normalizeScanHandle } from '@/lib/scan-identity'

export type ScanMode = 'wide' | 'social' | 'both'

export type ReputationScanBody = {
  limitPerQuery?: number
  mode?: ScanMode
  handles?: string[]
}

const GLOBAL_CANDIDATE_CAP = 250

type SearchHit = { url: string; title?: string; snippet?: string; scan_channel: ScanChannel }

async function runSerperQueries(
  provider: SerperProvider,
  queries: string[],
  channel: ScanChannel,
  limitPerQuery: number,
): Promise<SearchHit[]> {
  const results: SearchHit[] = []
  for (const q of queries) {
    try {
      const r = await provider.search(q, { limit: limitPerQuery })
      for (const item of r) {
        const norm = normalizeUrl(item.link)
        if (!norm) continue
        results.push({
          url: norm,
          title: item.title,
          snippet: item.snippet,
          scan_channel: channel,
        })
      }
    } catch {
      // continue
    }
  }
  return results
}

function mergeHitsByUrl(hits: SearchHit[]): Map<string, SearchHit> {
  const merged = new Map<string, SearchHit>()
  for (const h of hits) {
    merged.set(h.url, h)
  }
  return merged
}

export type ReputationScanResult =
  | {
      ok: true
      inserted: number
      skipped: number
      insertedByChannel: { web_wide: number; social: number }
      enriched: number
      pro: boolean
      mode: ScanMode
    }
  | { ok: false; error: string; status: number }

export async function runReputationScanCore(
  supabase: SupabaseClient,
  userId: string,
  body: ReputationScanBody,
): Promise<ReputationScanResult> {
  const limitPerQuery = Math.min(Math.max(body.limitPerQuery ?? 5, 1), 15)
  const mode: ScanMode = body.mode === 'wide' || body.mode === 'social' ? body.mode : 'both'

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_id')
    .eq('user_id', userId)
    .maybeSingle()

  const rawPlanId = (subscription as { plan_id?: string } | null)?.plan_id
  const normalizedPlanId = rawPlanId?.toLowerCase() || null
  const isProPlan = Boolean(
    normalizedPlanId && ['venus-pro', 'circe-elite', 'divine-duo'].includes(normalizedPlanId),
  )

  const [{ data: platforms }, { data: profileRow }, allowedFromDb] = await Promise.all([
    supabase
      .from('platform_connections')
      .select('platform,platform_username,niches')
      .eq('user_id', userId)
      .eq('is_connected', true),
    supabase.from('profiles').select('reputation_display_name').eq('id', userId).maybeSingle(),
    loadMergedHandlesForUser(supabase, userId),
  ])

  const niches = new Set<string>()
  for (const p of platforms || []) {
    if (Array.isArray((p as { niches?: string[] }).niches)) {
      for (const n of (p as { niches?: string[] }).niches!) {
        niches.add(String(n))
      }
    }
  }

  const displayName = (profileRow as { reputation_display_name?: string | null })?.reputation_display_name ?? null

  if (allowedFromDb.size === 0) {
    return {
      ok: false,
      status: 400,
      error:
        'No search handles yet. Add manual reputation handles on the Mentions page (or connect a platform / former @names).',
    }
  }

  const requested = Array.isArray(body.handles) ? body.handles.filter((h) => typeof h === 'string') : []
  if (Array.isArray(body.handles) && requested.length === 0) {
    return {
      ok: false,
      status: 400,
      error: 'Select at least one identity handle before running reputation scan.',
    }
  }
  let handleList: string[]
  if (requested.length > 0) {
    const filtered = filterHandlesToAllowed(requested, allowedFromDb)
    if (filtered.length === 0) {
      return {
        ok: false,
        status: 400,
        error:
          'No valid handles selected. Use only handles from your connected accounts, manual reputation handles, manual social profiles, or former usernames.',
      }
    }
    handleList = filtered
  } else {
    handleList = Array.from(allowedFromDb).map((h) => normalizeScanHandle(h))
  }

  const serperKey = process.env.SERPER_API_KEY
  if (!serperKey) {
    return {
      ok: false,
      status: 503,
      error:
        'Serper web search is not configured. Add SERPER_API_KEY to your server environment (e.g. Vercel → Environment Variables), then redeploy.',
    }
  }
  const provider = new SerperProvider(serperKey)

  const wideBase = mode === 'social' ? [] : buildWideWebQueries(handleList)
  const displayWide = mode === 'social' ? [] : buildDisplayNameQueries(displayName)
  const wideQueries = Array.from(new Set([...wideBase, ...displayWide])).slice(0, getReputationWideMaxQueries())
  const socialQueries = mode === 'wide' ? [] : buildSocialQueries(handleList)

  const wideHits =
    wideQueries.length > 0 ? await runSerperQueries(provider, wideQueries, 'web_wide', limitPerQuery) : []
  const socialHits =
    socialQueries.length > 0 ? await runSerperQueries(provider, socialQueries, 'social', limitPerQuery) : []

  const mergedMap = mergeHitsByUrl([...wideHits, ...socialHits])
  const candidates = Array.from(mergedMap.values()).slice(0, GLOBAL_CANDIDATE_CAP)

  if (candidates.length === 0) {
    return {
      ok: true,
      inserted: 0,
      skipped: 0,
      insertedByChannel: { web_wide: 0, social: 0 },
      enriched: 0,
      pro: isProPlan,
      mode,
    }
  }

  const { data: existing } = await supabase
    .from('reputation_mentions')
    .select('source_url')
    .eq('user_id', userId)
    .in(
      'source_url',
      candidates.map((c) => c.url),
    )

  const existingSet = new Set((existing || []).map((e: { source_url: string }) => e.source_url))

  const inserts = candidates
    .filter((c) => !existingSet.has(c.url))
    .map((c) => {
      const platform = guessSourcePlatform(c.url)
      return {
        user_id: userId,
        source: platform || 'web_search',
        platform,
        source_url: c.url,
        title: c.title || null,
        content_preview: c.snippet || '',
        sentiment: 'neutral',
        detected_at: new Date().toISOString(),
        is_read: false,
        is_reviewed: false,
        author: null,
        scan_channel: c.scan_channel,
      }
    })

  let insertedRows: Array<{
    id: string
    source_url: string
    platform?: string | null
    content_preview: string
  }> = []

  if (inserts.length > 0) {
    const { data: rows } = await supabase
      .from('reputation_mentions')
      .insert(inserts)
      .select('id, source_url, platform, content_preview')

    if (rows) {
      insertedRows = rows as typeof insertedRows
    }
  }

  const insertedByChannel = { web_wide: 0, social: 0 }
  for (const row of inserts) {
    if (row.scan_channel === 'web_wide') insertedByChannel.web_wide += 1
    else insertedByChannel.social += 1
  }

  let enrichedCount = 0
  const xaiKey = process.env.XAI_API_KEY

  if (insertedRows.length > 0 && isProPlan && xaiKey) {
    try {
      const items = insertedRows.map((m) => ({
        id: m.id,
        url: m.source_url,
        platform: m.platform || undefined,
        content: m.content_preview || '',
      }))

      const enrichments = await enrichReputationWithGrok({
        apiKey: xaiKey,
        items,
        niches: Array.from(niches),
      })

      if (enrichments.length > 0) {
        enrichedCount = enrichments.length

        await Promise.all(
          enrichments.map((e) => {
            const primary =
              e.replyProfessional || e.suggestedReply || e.replyWarm || e.replyWitty || null
            let ai_reply_variants: Record<string, string> | null = null
            if (e.recommendedAction === 'reply') {
              const v: Record<string, string> = {}
              if (e.replyWarm) v.warm = e.replyWarm
              if (e.replyProfessional || e.suggestedReply)
                v.professional = e.replyProfessional || e.suggestedReply || ''
              if (e.replyWitty) v.witty = e.replyWitty
              if (primary) v.primary = primary
              if (Object.keys(v).length > 0) ai_reply_variants = v
            }
            return supabase
              .from('reputation_mentions')
              .update({
                sentiment: e.sentiment,
                ai_category: e.category || null,
                ai_rationale: e.rationale || null,
                ai_suggested_reply: primary,
                ai_reply_variants,
                ai_reputation_impact: e.reputationImpact || null,
                ai_recommended_action: e.recommendedAction || null,
              })
              .eq('user_id', userId)
              .eq('id', e.id || '')
          }),
        )
      }
    } catch {
      // Grok enrichment is best-effort
    }
  }

  return {
    ok: true,
    inserted: inserts.length,
    skipped: candidates.length - inserts.length,
    insertedByChannel,
    enriched: enrichedCount,
    pro: isProPlan,
    mode,
  }
}
