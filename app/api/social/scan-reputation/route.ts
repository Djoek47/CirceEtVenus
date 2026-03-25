import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SerperProvider } from '@/lib/leaks/search-providers'
import { normalizeUrl, guessSourcePlatform } from '@/lib/leaks/url-utils'
import { enrichReputationWithGrok } from '@/lib/reputation/grok-enrichment'
import {
  buildWideWebQueries,
  buildSocialQueries,
  type ScanChannel,
} from '@/lib/reputation/build-queries'

type ScanMode = 'wide' | 'social' | 'both'

type ScanBody = {
  limitPerQuery?: number
  mode?: ScanMode
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

/**
 * Merge by URL: later entries overwrite earlier. Run wide first, then social so
 * duplicate URLs are classified as social (per plan).
 */
function mergeHitsByUrl(hits: SearchHit[]): Map<string, SearchHit> {
  const merged = new Map<string, SearchHit>()
  for (const h of hits) {
    merged.set(h.url, h)
  }
  return merged
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: ScanBody = await req.json().catch(() => ({} as ScanBody))
  const limitPerQuery = Math.min(Math.max(body.limitPerQuery ?? 5, 1), 15)
  const mode: ScanMode = body.mode === 'wide' || body.mode === 'social' ? body.mode : 'both'

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const rawPlanId = (subscription as any)?.plan_id as string | null | undefined
  const normalizedPlanId = rawPlanId?.toLowerCase() || null
  const isProPlan = Boolean(
    normalizedPlanId && ['venus-pro', 'circe-elite', 'divine-duo'].includes(normalizedPlanId),
  )

  const [{ data: profiles }, { data: platforms }, { data: profileRow }] = await Promise.all([
    supabase.from('social_profiles').select('platform,username').eq('user_id', user.id),
    supabase
      .from('platform_connections')
      .select('platform,platform_username,niches')
      .eq('user_id', user.id)
      .eq('is_connected', true),
    supabase.from('profiles').select('former_usernames').eq('id', user.id).maybeSingle(),
  ])

  const usernames = new Set<string>()
  const niches = new Set<string>()
  for (const p of profiles || []) {
    if ((p as any).username) usernames.add((p as any).username)
  }
  for (const p of platforms || []) {
    if ((p as any).platform_username) usernames.add((p as any).platform_username)
    if (Array.isArray((p as any).niches)) {
      for (const n of (p as any).niches) niches.add(String(n))
    }
  }
  const former = (profileRow as any)?.former_usernames as string[] | null | undefined
  if (Array.isArray(former)) {
    for (const h of former) {
      if (h && String(h).trim()) usernames.add(String(h).trim())
    }
  }

  if (usernames.size === 0) {
    return NextResponse.json({ error: 'No usernames connected for reputation scan' }, { status: 400 })
  }

  const serperKey = process.env.SERPER_API_KEY
  if (!serperKey) {
    return NextResponse.json(
      {
        error:
          'Serper web search is not configured. Add SERPER_API_KEY to your server environment (e.g. Vercel → Settings → Environment Variables), then redeploy. Create a key at https://serper.dev — the same key powers leak scans and reputation scans.',
      },
      { status: 503 },
    )
  }
  const provider = new SerperProvider(serperKey)
  const handleList = Array.from(usernames)

  const wideQueries = mode === 'social' ? [] : buildWideWebQueries(handleList)
  const socialQueries = mode === 'wide' ? [] : buildSocialQueries(handleList)

  const wideHits =
    wideQueries.length > 0
      ? await runSerperQueries(provider, wideQueries, 'web_wide', limitPerQuery)
      : []
  const socialHits =
    socialQueries.length > 0
      ? await runSerperQueries(provider, socialQueries, 'social', limitPerQuery)
      : []

  const mergedMap = mergeHitsByUrl([...wideHits, ...socialHits])
  const candidates = Array.from(mergedMap.values()).slice(0, GLOBAL_CANDIDATE_CAP)

  if (candidates.length === 0) {
    return NextResponse.json({
      success: true,
      inserted: 0,
      skipped: 0,
      insertedByChannel: { web_wide: 0, social: 0 },
      mode,
    })
  }

  const { data: existing } = await supabase
    .from('reputation_mentions')
    .select('source_url')
    .eq('user_id', user.id)
    .in(
      'source_url',
      candidates.map((c) => c.url),
    )

  const existingSet = new Set((existing || []).map((e: any) => e.source_url))

  const inserts = candidates
    .filter((c) => !existingSet.has(c.url))
    .map((c) => {
      const platform = guessSourcePlatform(c.url)
      return {
        user_id: user.id,
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
      insertedRows = rows as any
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
          enrichments.map((e) =>
            supabase
              .from('reputation_mentions')
              .update({
                sentiment: e.sentiment,
                ai_category: e.category || null,
                ai_rationale: e.rationale || null,
                ai_suggested_reply: e.suggestedReply || null,
                ai_reputation_impact: e.reputationImpact || null,
                ai_recommended_action: e.recommendedAction || null,
              })
              .eq('user_id', user.id)
              .eq('id', e.id || ''),
          ),
        )
      }
    } catch {
      // Grok enrichment is best-effort
    }
  }

  return NextResponse.json({
    success: true,
    inserted: inserts.length,
    skipped: candidates.length - inserts.length,
    insertedByChannel,
    enriched: enrichedCount,
    pro: isProPlan,
    mode,
  })
}
