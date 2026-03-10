import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SerperProvider } from '@/lib/leaks/search-providers'
import { guessSourcePlatform, normalizeUrl } from '@/lib/leaks/url-utils'
import { enrichWithGrok } from '@/lib/leaks/grok-enrichment'

type ScanBody = {
  // Optional user-supplied suspected infringing URLs
  urls?: string[]
  // Extra aliases (if the creator uses multiple handles)
  aliases?: string[]
  // Limit per query
  limitPerQuery?: number
}

function buildQueries(usernames: string[]) {
  const baseKeywords = [
    'onlyfans leak',
    'onlyfans leaked',
    'mega',
    'telegram',
    'reddit',
    'download',
    'free onlyfans',
    'coomer',
    'kemono',
  ]

  const queries: string[] = []
  for (const u of usernames) {
    const clean = u.replace(/^@/, '').trim()
    if (!clean) continue
    for (const kw of baseKeywords) {
      queries.push(`"${clean}" ${kw}`)
      queries.push(`onlyfans ${clean} ${kw}`)
    }
  }
  // Deduplicate while preserving order
  return Array.from(new Set(queries))
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: ScanBody = await req.json().catch(() => ({} as any))
  const limitPerQuery = Math.min(Math.max(body.limitPerQuery ?? 8, 1), 20)

  // Pro gating (used for Grok enrichment)
  const { data: subRow } = await supabase
    .from('subscriptions')
    .select('plan,plan_id,status')
    .eq('user_id', user.id)
    .maybeSingle()
  const planId = (subRow as any)?.plan_id || (subRow as any)?.plan
  const isPro = Boolean(planId && ['venus-pro', 'circe-elite', 'divine-duo'].includes(planId))

  // Load connected platform usernames (OnlyFans primary)
  const { data: connections } = await supabase
    .from('platform_connections')
    .select('platform, platform_username')
    .eq('user_id', user.id)
    .eq('is_connected', true)

  const connectedUsernames = (connections || [])
    .filter((c) => typeof c.platform_username === 'string' && c.platform_username.length > 0)
    .map((c) => c.platform_username as string)

  const usernames = Array.from(
    new Set([
      ...connectedUsernames,
      ...(body.aliases || []),
    ]),
  )

  // Always include user-provided URLs (manual report flow)
  const userUrls = (body.urls || []).map((u) => normalizeUrl(u)).filter(Boolean) as string[]

  const serperKey = process.env.SERPER_API_KEY
  const provider = serperKey ? new SerperProvider(serperKey) : null

  const discovered: Array<{
    url: string
    query?: string
    title?: string
    snippet?: string
  }> = []

  if (provider && usernames.length > 0) {
    const queries = buildQueries(usernames).slice(0, 30) // safety cap
    for (const q of queries) {
      try {
        const results = await provider.search(q, { limit: limitPerQuery })
        for (const r of results) {
          const norm = normalizeUrl(r.link)
          if (!norm) continue
          discovered.push({ url: norm, query: q, title: r.title, snippet: r.snippet })
        }
      } catch {
        // continue other queries
      }
    }
  }

  // Merge + dedupe
  const merged = new Map<string, { url: string; query?: string; title?: string; snippet?: string }>()
  for (const u of userUrls) merged.set(u, { url: u })
  for (const d of discovered) if (!merged.has(d.url)) merged.set(d.url, d)

  const candidates = Array.from(merged.values()).slice(0, 200)
  if (candidates.length === 0) {
    return NextResponse.json({
      success: true,
      inserted: 0,
      skipped: 0,
      message: provider ? 'No results found' : 'Search provider not configured and no URLs provided',
    })
  }

  // Check existing to avoid duplicates (best-effort)
  const { data: existing } = await supabase
    .from('leak_alerts')
    .select('source_url')
    .eq('user_id', user.id)
    .in('source_url', candidates.map((c) => c.url))

  const existingSet = new Set((existing || []).map((e: any) => e.source_url))

  const inserts = candidates
    .filter((c) => !existingSet.has(c.url))
    .map((c) => ({
      user_id: user.id,
      source_url: c.url,
      source_platform: guessSourcePlatform(c.url),
      detected_at: new Date().toISOString(),
      status: 'detected',
      severity: 'medium',
      detected_by: c.query ? 'search_api' : 'user_report',
      query: c.query || null,
      notes: c.title || c.snippet ? JSON.stringify({ title: c.title, snippet: c.snippet }) : null,
    }))

  if (inserts.length > 0) {
    const { data: insertedRows } = await supabase
      .from('leak_alerts')
      .insert(inserts)
      .select('id,source_url,notes')

    // Pro-only Grok enrichment (best-effort)
    const grokKey = process.env.XAI_API_KEY
    if (isPro && grokKey && insertedRows && insertedRows.length > 0) {
      const byUrl = new Map<string, any>()
      insertedRows.forEach((r: any) => byUrl.set(r.source_url, r))

      // Batch to keep prompts small
      const batchSize = 12
      for (let i = 0; i < candidates.length; i += batchSize) {
        const batch = candidates.slice(i, i + batchSize)
        try {
          const enriched = await enrichWithGrok({ apiKey: grokKey, items: batch })
          for (const e of enriched) {
            const row = byUrl.get(e.url)
            if (!row) continue
            const nextNotes = {
              ...(row.notes ? safeJsonParse(row.notes) : {}),
              grok: e,
            }
            await supabase
              .from('leak_alerts')
              .update({
                severity: e.severity || 'medium',
                notes: JSON.stringify(nextNotes),
              })
              .eq('id', row.id)
          }
        } catch {
          // ignore enrichment failures
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    inserted: inserts.length,
    skipped: candidates.length - inserts.length,
    providerConfigured: Boolean(provider),
    grokEnrichment: isPro && Boolean(process.env.XAI_API_KEY),
  })
}

function safeJsonParse(input: string) {
  try {
    return JSON.parse(input)
  } catch {
    return {}
  }
}

