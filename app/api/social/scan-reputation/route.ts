import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SerperProvider } from '@/lib/leaks/search-providers'
import { normalizeUrl, guessSourcePlatform } from '@/lib/leaks/url-utils'
import { enrichReputationWithGrok } from '@/lib/reputation/grok-enrichment'

type ScanBody = {
  limitPerQuery?: number
}

function buildQueries(usernames: string[]) {
  const queries: string[] = []
  const base = [
    'reviews',
    'drama',
    'controversy',
    'scam',
    'worth it',
    'subscribed',
    'leak',
    'reddit thread',
  ]
  for (const name of usernames) {
    const clean = name.replace(/^@/, '').trim()
    if (!clean) continue
    // Broad queries
    queries.push(`"${clean}" onlyfans`)
    queries.push(`"${clean}" fansly`)
    queries.push(`"${clean}" creator`)
    for (const kw of base) {
      queries.push(`"${clean}" ${kw}`)
    }
    // Platform-specific
    queries.push(`"${clean}" site:twitter.com`)
    queries.push(`"${clean}" site:x.com`)
    queries.push(`"${clean}" site:reddit.com`)
    queries.push(`"${clean}" site:tiktok.com`)
    queries.push(`"${clean}" site:instagram.com`)
  }
  return Array.from(new Set(queries))
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: ScanBody = await req.json().catch(() => ({} as any))
  const limitPerQuery = Math.min(Math.max(body.limitPerQuery ?? 5, 1), 15)

  // Determine plan to gate Grok enrichment for Pro users only
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

  // Gather usernames from social_profiles + platform_connections
  const [{ data: profiles }, { data: platforms }] = await Promise.all([
    supabase.from('social_profiles').select('platform,username').eq('user_id', user.id),
    supabase
      .from('platform_connections')
      .select('platform,platform_username,niches')
      .eq('user_id', user.id)
      .eq('is_connected', true),
  ])

  const usernames = new Set<string>()
  for (const p of profiles || []) {
    if ((p as any).username) usernames.add((p as any).username)
  }
  const niches = new Set<string>()
  for (const p of platforms || []) {
    if ((p as any).platform_username) usernames.add((p as any).platform_username)
    if (Array.isArray((p as any).niches)) {
      for (const n of (p as any).niches) niches.add(String(n))
    }
  }

  if (usernames.size === 0) {
    return NextResponse.json({ error: 'No usernames connected for reputation scan' }, { status: 400 })
  }

  const serperKey = process.env.SERPER_API_KEY
  if (!serperKey) {
    return NextResponse.json({ error: 'Search provider not configured' }, { status: 500 })
  }
  const provider = new SerperProvider(serperKey)

  const queries = buildQueries(Array.from(usernames)).slice(0, 30)
  const results: Array<{ url: string; title?: string; snippet?: string }> = []

  for (const q of queries) {
    try {
      const r = await provider.search(q, { limit: limitPerQuery })
      for (const item of r) {
        const norm = normalizeUrl(item.link)
        if (!norm) continue
        results.push({ url: norm, title: item.title, snippet: item.snippet })
      }
    } catch {
      // continue
    }
  }

  if (results.length === 0) {
    return NextResponse.json({ success: true, inserted: 0, skipped: 0 })
  }

  const merged = new Map<string, { url: string; title?: string; snippet?: string }>()
  for (const r of results) {
    if (!merged.has(r.url)) merged.set(r.url, r)
  }
  const candidates = Array.from(merged.values()).slice(0, 250)

  const { data: existing } = await supabase
    .from('reputation_mentions')
    .select('source_url')
    .eq('user_id', user.id)
    .in('source_url', candidates.map((c) => c.url))

  const existingSet = new Set((existing || []).map((e: any) => e.source_url))

  const inserts = candidates
    .filter((c) => !existingSet.has(c.url))
    .map((c) => ({
      user_id: user.id,
      platform: guessSourcePlatform(c.url),
      source_url: c.url,
      title: c.title || null,
      content_preview: c.snippet || '',
      sentiment: 'neutral',
      detected_at: new Date().toISOString(),
      is_read: false,
      is_reviewed: false,
      author: null,
    }))

  let insertedRows: Array<{ id: string; source_url: string; platform?: string | null; content_preview: string }> = []

  if (inserts.length > 0) {
    const { data: rows } = await supabase
      .from('reputation_mentions')
      .insert(inserts)
      .select('id, source_url, platform, content_preview')

    if (rows) {
      insertedRows = rows as any
    }
  }

  // Pro-only Grok enrichment for newly inserted mentions
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
              })
              .eq('user_id', user.id)
              .eq('id', e.id || '')
          )
        )
      }
    } catch {
      // Grok enrichment is best-effort; ignore failures so base scan still succeeds
    }
  }

  return NextResponse.json({
    success: true,
    inserted: inserts.length,
    skipped: candidates.length - inserts.length,
    enriched: enrichedCount,
    pro: isProPlan,
  })
}

