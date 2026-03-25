import type { SupabaseClient } from '@supabase/supabase-js'
import { SerperProvider } from '@/lib/leaks/search-providers'
import { guessSourcePlatform, normalizeUrl } from '@/lib/leaks/url-utils'
import { enrichWithGrok, type GrokLeakEnrichment } from '@/lib/leaks/grok-enrichment'
import { pageLikelyMentionsAliases } from '@/lib/leaks/fetch-verify'

export type RunLeakScanParams = {
  userId: string
  urls?: string[]
  aliases?: string[]
  limitPerQuery?: number
  /** When true, search hits are filtered (Grok for Pro, keyword gate otherwise). Manual URLs are never filtered. Default true. */
  strict?: boolean
}

export type RunLeakScanResult = {
  success: boolean
  inserted: number
  skipped: number
  filteredStrict: number
  message?: string
  providerConfigured: boolean
  grokEnrichment: boolean
  /** Number of unique URLs checked with optional HTML fetch (when LEAK_SCAN_FETCH_VERIFY_TOP_N is set) */
  fetchVerified?: number
}

function parseIntEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name]
  const v = raw ? parseInt(raw, 10) : NaN
  if (Number.isNaN(v)) return fallback
  return Math.min(Math.max(v, min), max)
}

/** Expanded leak-oriented query templates (OF + Fansly + common leak venues). */
export function buildQueries(usernames: string[]): string[] {
  const baseKeywords = [
    'onlyfans leak',
    'onlyfans leaked',
    'fansly leak',
    'fansly leaked',
    'mega',
    'telegram',
    'reddit',
    'site:reddit.com',
    'download',
    'free onlyfans',
    'coomer',
    'kemono',
    'simpcity',
    'forums',
    'discord',
  ]

  const queries: string[] = []
  for (const u of usernames) {
    const clean = u.replace(/^@/, '').trim()
    if (!clean) continue
    for (const kw of baseKeywords) {
      queries.push(`"${clean}" ${kw}`)
      queries.push(`onlyfans ${clean} ${kw}`)
      queries.push(`fansly ${clean} ${kw}`)
    }
  }
  return Array.from(new Set(queries))
}

function safeJsonParse(input: string) {
  try {
    return JSON.parse(input)
  } catch {
    return {}
  }
}

function matchesKeywordGate(
  c: { url: string; title?: string; snippet?: string },
  usernames: string[],
): boolean {
  const hay = `${c.title ?? ''} ${c.snippet ?? ''} ${c.url}`.toLowerCase()
  for (const u of usernames) {
    const clean = u.replace(/^@/, '').trim().toLowerCase()
    if (clean.length >= 2 && hay.includes(clean)) return true
  }
  return false
}

export async function runLeakScan(
  supabase: SupabaseClient,
  params: RunLeakScanParams,
): Promise<RunLeakScanResult> {
  const { userId, urls: bodyUrls, aliases: bodyAliases, limitPerQuery: bodyLimit } = params
  const strict = params.strict !== false

  const limitPerQuery = Math.min(Math.max(bodyLimit ?? parseIntEnv('LEAK_SCAN_RESULTS_PER_QUERY', 10, 1, 20), 1), 20)
  const maxQueries = parseIntEnv('LEAK_SCAN_MAX_QUERIES', 45, 1, 80)
  const maxPagesPerQuery = parseIntEnv('LEAK_SCAN_MAX_PAGES', 1, 1, 3)
  const maxCandidates = parseIntEnv('LEAK_SCAN_MAX_CANDIDATES', 250, 50, 500)
  const fetchVerifyTopN = parseIntEnv('LEAK_SCAN_FETCH_VERIFY_TOP_N', 0, 0, 25)

  const { data: subRow } = await supabase
    .from('subscriptions')
    .select('plan_id,status')
    .eq('user_id', userId)
    .maybeSingle()
  const rawPlanId = (subRow as { plan_id?: string | null })?.plan_id
  const normalizedPlanId = rawPlanId?.toLowerCase() || null
  const isPro = Boolean(
    normalizedPlanId && ['venus-pro', 'circe-elite', 'divine-duo'].includes(normalizedPlanId),
  )

  const { data: connections } = await supabase
    .from('platform_connections')
    .select('platform, platform_username')
    .eq('user_id', userId)
    .eq('is_connected', true)

  const connectedUsernames = (connections || [])
    .filter((c) => typeof c.platform_username === 'string' && c.platform_username.length > 0)
    .map((c) => c.platform_username as string)

  const usernames = Array.from(new Set([...connectedUsernames, ...(bodyAliases || [])]))

  const userUrls = (bodyUrls || []).map((u) => normalizeUrl(u)).filter(Boolean) as string[]
  const manualSet = new Set(userUrls)

  const serperKey = process.env.SERPER_API_KEY
  const provider = serperKey ? new SerperProvider(serperKey) : null

  const discovered: Array<{
    url: string
    query?: string
    title?: string
    snippet?: string
  }> = []

  if (provider && usernames.length > 0) {
    const queries = buildQueries(usernames).slice(0, maxQueries)
    for (const q of queries) {
      for (let page = 1; page <= maxPagesPerQuery; page++) {
        try {
          const results = await provider.search(q, { limit: limitPerQuery, page })
          for (const r of results) {
            const norm = normalizeUrl(r.link)
            if (!norm) continue
            discovered.push({ url: norm, query: q, title: r.title, snippet: r.snippet })
          }
        } catch {
          break
        }
      }
    }
  }

  // Optional fetch-verify: first N unique URLs must mention an alias in fetched HTML; others pass through
  let fetchVerified = 0
  const aliasNeedles = usernames
  if (fetchVerifyTopN > 0 && aliasNeedles.length > 0) {
    const out: typeof discovered = []
    const verifiedUnique = new Set<string>()
    for (const d of discovered) {
      if (verifiedUnique.has(d.url)) {
        out.push(d)
        continue
      }
      if (verifiedUnique.size < fetchVerifyTopN) {
        verifiedUnique.add(d.url)
        const ok = await pageLikelyMentionsAliases(d.url, aliasNeedles)
        fetchVerified++
        if (ok) out.push(d)
      } else {
        out.push(d)
      }
    }
    discovered.length = 0
    discovered.push(...out)
  }

  const merged = new Map<string, { url: string; query?: string; title?: string; snippet?: string }>()
  for (const u of userUrls) merged.set(u, { url: u })
  for (const d of discovered) if (!merged.has(d.url)) merged.set(d.url, d)

  let candidates = Array.from(merged.values()).slice(0, maxCandidates)
  let filteredStrict = 0
  const preGrokByUrl = new Map<string, GrokLeakEnrichment>()

  if (candidates.length === 0) {
    return {
      success: true,
      inserted: 0,
      skipped: 0,
      filteredStrict: 0,
      message: provider ? 'No results found' : 'Search provider not configured and no URLs provided',
      providerConfigured: Boolean(provider),
      grokEnrichment: isPro && Boolean(process.env.XAI_API_KEY),
      fetchVerified: fetchVerifyTopN > 0 ? fetchVerified : undefined,
    }
  }

  if (strict) {
    const grokKey = process.env.XAI_API_KEY
    const searchOnly = candidates.filter((c) => !manualSet.has(c.url))
    const manualOnes = candidates.filter((c) => manualSet.has(c.url))

    let passedSearch = searchOnly

    if (searchOnly.length > 0) {
      if (isPro && grokKey) {
        const preApproved: typeof searchOnly = []
        const batchSize = 12
        for (let i = 0; i < searchOnly.length; i += batchSize) {
          const batch = searchOnly.slice(i, i + batchSize)
          try {
            const enriched = await enrichWithGrok({ apiKey: grokKey, items: batch })
            const grokMap = new Map(enriched.map((e) => [e.url, e]))
            for (const c of batch) {
              const e = grokMap.get(c.url)
              if (e?.likelyLeak) {
                preGrokByUrl.set(c.url, e)
                preApproved.push(c)
              } else {
                filteredStrict++
              }
            }
          } catch {
            for (const c of batch) {
              if (matchesKeywordGate(c, usernames)) preApproved.push(c)
              else filteredStrict++
            }
          }
        }
        passedSearch = preApproved
      } else {
        passedSearch = searchOnly.filter((c) => {
          const ok = matchesKeywordGate(c, usernames)
          if (!ok) filteredStrict++
          return ok
        })
      }
    }

    candidates = [...manualOnes, ...passedSearch]
  }

  const { data: existing } = await supabase
    .from('leak_alerts')
    .select('source_url')
    .eq('user_id', userId)
    .in(
      'source_url',
      candidates.map((c) => c.url),
    )

  const existingSet = new Set((existing || []).map((e: { source_url: string }) => e.source_url))

  const grokKey = process.env.XAI_API_KEY
  const needPostGrok =
    !strict && isPro && Boolean(grokKey) && candidates.some((c) => !manualSet.has(c.url))

  const inserts = candidates
    .filter((c) => !existingSet.has(c.url))
    .map((c) => {
      const fromSearch = Boolean(c.query)
      const grokPre = preGrokByUrl.get(c.url)
      const baseNotes =
        c.title || c.snippet
          ? {
              title: c.title,
              snippet: c.snippet,
              ...(grokPre ? { grok: grokPre } : {}),
            }
          : grokPre
            ? { grok: grokPre }
            : null

      return {
        user_id: userId,
        source_url: c.url,
        source_platform: guessSourcePlatform(c.url),
        detected_at: new Date().toISOString(),
        status: 'detected' as const,
        severity: (grokPre?.severity as 'critical' | 'high' | 'medium' | 'low' | undefined) || 'medium',
        detected_by: fromSearch ? 'search_api' : 'user_report',
        query: c.query || null,
        notes: baseNotes ? JSON.stringify(baseNotes) : null,
      }
    })

  if (inserts.length > 0) {
    const { data: insertedRows, error: insertErr } = await supabase
      .from('leak_alerts')
      .insert(inserts)
      .select('id,source_url,notes')

    if (insertErr) {
      return {
        success: false,
        inserted: 0,
        skipped: candidates.length,
        filteredStrict,
        message: insertErr.message,
        providerConfigured: Boolean(provider),
        grokEnrichment: isPro && Boolean(process.env.XAI_API_KEY),
        fetchVerified: fetchVerifyTopN > 0 ? fetchVerified : undefined,
      }
    }

    if (needPostGrok && grokKey && insertedRows && insertedRows.length > 0) {
      const byUrl = new Map<string, { id: string; source_url: string; notes: string | null }>()
      insertedRows.forEach((r: { id: string; source_url: string; notes: string | null }) =>
        byUrl.set(r.source_url, r),
      )

      const batchSize = 12
      for (let i = 0; i < candidates.length; i += batchSize) {
        const batch = candidates.slice(i, i + batchSize).filter((c) => !manualSet.has(c.url))
        if (batch.length === 0) continue
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

  return {
    success: true,
    inserted: inserts.length,
    skipped: candidates.length - inserts.length,
    filteredStrict,
    providerConfigured: Boolean(provider),
    grokEnrichment: isPro && Boolean(process.env.XAI_API_KEY),
    fetchVerified: fetchVerifyTopN > 0 ? fetchVerified : undefined,
  }
}
