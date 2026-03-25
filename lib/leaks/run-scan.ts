import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeScanHandle } from '@/lib/scan-identity'
import { buildQueries, buildTitleQueries, sanitizeTitleForSearch } from '@/lib/leaks/build-queries'
import { SerperProvider } from '@/lib/leaks/search-providers'
import { guessSourcePlatform, normalizeUrl } from '@/lib/leaks/url-utils'
import { enrichWithGrok, type GrokLeakEnrichment } from '@/lib/leaks/grok-enrichment'
import { verifyLeakPagesWithGrok } from '@/lib/leaks/grok-page-verify'
import { fetchPageTextExcerpt, pageLikelyMentionsAliases } from '@/lib/leaks/fetch-verify'

export type RunLeakScanParams = {
  userId: string
  urls?: string[]
  aliases?: string[]
  /** Extra handles for this run only (merged with profile former_usernames) */
  former_usernames?: string[]
  /** Extra title phrases for this run (merged with profile + content library) */
  title_hints?: string[]
  /** Load published/scheduled titles from content table (default true unless content_ids set) */
  include_content_titles?: boolean
  limitPerQuery?: number
  strict?: boolean
  /** Restrict handle-based queries to this subset (must match merged username list for this run). */
  focus_handles?: string[]
  /** Only search these content rows’ titles (owned by user). When set, full library pull is off unless include_content_titles is true. */
  content_ids?: string[]
  /** Filter merged title list to those matching these phrases (substring). */
  focus_title_hints?: string[]
}

export type RunLeakScanResult = {
  success: boolean
  inserted: number
  skipped: number
  filteredStrict: number
  message?: string
  /** When set, API route should use this status (e.g. 400 for validation). */
  statusCode?: number
  providerConfigured: boolean
  grokEnrichment: boolean
  fetchVerified?: number
  pageVerifyCount?: number
}

function parseIntEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name]
  const v = raw ? parseInt(raw, 10) : NaN
  if (Number.isNaN(v)) return fallback
  return Math.min(Math.max(v, min), max)
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
  titleNeedles: string[],
): boolean {
  const hay = `${c.title ?? ''} ${c.snippet ?? ''} ${c.url}`.toLowerCase()
  for (const u of usernames) {
    const clean = u.replace(/^@/, '').trim().toLowerCase()
    if (clean.length >= 2 && hay.includes(clean)) return true
  }
  for (const needle of titleNeedles) {
    const n = needle.toLowerCase().trim()
    if (n.length >= 4 && hay.includes(n)) return true
  }
  return false
}

function titleNeedlesFromList(titles: string[]): string[] {
  const out: string[] = []
  for (const raw of titles) {
    const s = sanitizeTitleForSearch(raw)
    if (s) out.push(s)
  }
  return out
}

export async function runLeakScan(
  supabase: SupabaseClient,
  params: RunLeakScanParams,
): Promise<RunLeakScanResult> {
  const {
    userId,
    urls: bodyUrls,
    aliases: bodyAliases,
    former_usernames: bodyFormer,
    title_hints: bodyTitleHints,
    limitPerQuery: bodyLimit,
  } = params
  const strict = params.strict !== false
  const contentIdsParam = Array.isArray(params.content_ids)
    ? params.content_ids.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : []
  const includeBulkContentTitles =
    params.include_content_titles === true ||
    (params.include_content_titles !== false && contentIdsParam.length === 0)

  const limitPerQuery = Math.min(Math.max(bodyLimit ?? parseIntEnv('LEAK_SCAN_RESULTS_PER_QUERY', 10, 1, 20), 1), 20)
  const maxQueries = parseIntEnv('LEAK_SCAN_MAX_QUERIES', 45, 1, 80)
  const maxTitleQueries = parseIntEnv('LEAK_SCAN_MAX_TITLE_QUERIES', 20, 0, 60)
  const maxPagesPerQuery = parseIntEnv('LEAK_SCAN_MAX_PAGES', 1, 1, 3)
  const maxCandidates = parseIntEnv('LEAK_SCAN_MAX_CANDIDATES', 250, 50, 500)
  const fetchVerifyTopN = parseIntEnv('LEAK_SCAN_FETCH_VERIFY_TOP_N', 0, 0, 25)
  const scrapeMaxPages = parseIntEnv('LEAK_SCAN_SCRAPE_MAX_PAGES', 8, 0, 25)
  const maxContentTitles = parseIntEnv('LEAK_SCAN_CONTENT_TITLE_LIMIT', 40, 0, 80)

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

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('former_usernames, leak_search_title_hints')
    .eq('id', userId)
    .maybeSingle()

  const profileFormer = Array.isArray((profileRow as { former_usernames?: string[] })?.former_usernames)
    ? ((profileRow as { former_usernames: string[] }).former_usernames ?? []).filter(Boolean)
    : []
  const profileTitleHints = Array.isArray((profileRow as { leak_search_title_hints?: string[] })?.leak_search_title_hints)
    ? ((profileRow as { leak_search_title_hints: string[] }).leak_search_title_hints ?? []).filter(Boolean)
    : []

  const { data: connections } = await supabase
    .from('platform_connections')
    .select('platform, platform_username')
    .eq('user_id', userId)
    .eq('is_connected', true)

  const { data: socialProfileRows } = await supabase
    .from('social_profiles')
    .select('username')
    .eq('user_id', userId)

  const connectedUsernames = (connections || [])
    .filter((c) => typeof c.platform_username === 'string' && c.platform_username.length > 0)
    .map((c) => normalizeScanHandle(c.platform_username as string))

  const socialUsernames = (socialProfileRows || [])
    .map((r: { username?: string }) => r.username)
    .filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
    .map((u) => normalizeScanHandle(u))

  const formerFromBody = Array.isArray(bodyFormer) ? bodyFormer.filter((s) => typeof s === 'string' && s.trim()) : []
  let usernames = Array.from(
    new Set(
      [
        ...connectedUsernames,
        ...socialUsernames,
        ...(bodyAliases || []).map((s) => normalizeScanHandle(s)),
        ...profileFormer.map((s) => normalizeScanHandle(s)),
        ...formerFromBody.map((s) => normalizeScanHandle(s)),
      ].filter(Boolean),
    ),
  )

  const focusHandlesRaw = Array.isArray(params.focus_handles)
    ? params.focus_handles.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : []
  if (focusHandlesRaw.length > 0) {
    const allowed = new Set(usernames.map((u) => u.toLowerCase()))
    const narrowed = focusHandlesRaw
      .map((h) => normalizeScanHandle(h))
      .filter((h) => allowed.has(h.toLowerCase()))
    if (narrowed.length === 0) {
      return {
        success: false,
        inserted: 0,
        skipped: 0,
        filteredStrict: 0,
        statusCode: 400,
        message:
          'Focus handles did not match your connected identities. Clear the selection or pick handles from your list.',
        providerConfigured: Boolean(process.env.SERPER_API_KEY),
        grokEnrichment: false,
      }
    }
    usernames = Array.from(new Set(narrowed))
  }

  let contentTitles: string[] = []
  if (contentIdsParam.length > 0) {
    const { data: idRows } = await supabase
      .from('content')
      .select('title')
      .eq('user_id', userId)
      .in('id', contentIdsParam)

    contentTitles = (idRows || [])
      .map((r: { title?: string }) => r.title)
      .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
  }

  if (includeBulkContentTitles && maxContentTitles > 0) {
    const { data: contentRows } = await supabase
      .from('content')
      .select('title')
      .eq('user_id', userId)
      .in('status', ['published', 'scheduled'])
      .order('created_at', { ascending: false })
      .limit(maxContentTitles)

    const bulk = (contentRows || [])
      .map((r: { title?: string }) => r.title)
      .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    contentTitles = Array.from(new Set([...contentTitles, ...bulk]))
  }

  const hintsFromBody = Array.isArray(bodyTitleHints) ? bodyTitleHints.filter((s) => typeof s === 'string' && s.trim()) : []
  let mergedTitles = Array.from(
    new Set([...contentTitles, ...profileTitleHints, ...hintsFromBody].map((t) => t.trim()).filter(Boolean)),
  )

  const focusTitleRaw = Array.isArray(params.focus_title_hints)
    ? params.focus_title_hints.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : []
  if (focusTitleRaw.length > 0) {
    const needles = focusTitleRaw.map((f) => f.toLowerCase().trim())
    mergedTitles = mergedTitles.filter((t) => {
      const tl = t.toLowerCase()
      return needles.some((n) => tl.includes(n) || n.includes(tl))
    })
    if (mergedTitles.length === 0) {
      return {
        success: false,
        inserted: 0,
        skipped: 0,
        filteredStrict: 0,
        statusCode: 400,
        message:
          'No content titles matched your focus. Adjust title hints or include more saved titles / library content.',
        providerConfigured: Boolean(process.env.SERPER_API_KEY),
        grokEnrichment: false,
      }
    }
  }

  const titleNeedles = titleNeedlesFromList(mergedTitles)
  const primaryHandle = usernames[0] || connectedUsernames[0]

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

  const handleQueries = buildQueries(usernames).slice(0, maxQueries)
  const titleQueries =
    mergedTitles.length > 0 && maxTitleQueries > 0
      ? buildTitleQueries(mergedTitles, primaryHandle, maxTitleQueries)
      : []
  const queriesToRun = Array.from(new Set([...handleQueries, ...titleQueries]))

  if (provider && queriesToRun.length > 0) {
    for (const q of queriesToRun) {
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
    const hasManual = userUrls.length > 0
    let message: string
    if (!provider) {
      message =
        'Serper web search is not configured: add SERPER_API_KEY to your environment (e.g. Vercel Project → Settings → Environment Variables; key from serper.dev). Until then, use “Bring your own link” to add URLs to your leak list.'
    } else if (usernames.length === 0 && mergedTitles.length === 0 && !hasManual) {
      message =
        'Nothing to search: connect OnlyFans/Fansly, add aliases or former usernames, add content title hints, or paste a URL under “Bring your own link”.'
    } else {
      message = 'No results found for the current queries.'
    }
    return {
      success: true,
      inserted: 0,
      skipped: 0,
      filteredStrict: 0,
      message,
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
              if (matchesKeywordGate(c, usernames, titleNeedles)) preApproved.push(c)
              else filteredStrict++
            }
          }
        }
        passedSearch = preApproved
      } else {
        passedSearch = searchOnly.filter((c) => {
          const ok = matchesKeywordGate(c, usernames, titleNeedles)
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

  let pageVerifyCount = 0
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

    // Critical / high: optional page fetch + second Grok pass (Pro + XAI)
    if (scrapeMaxPages > 0 && isPro && grokKey && insertedRows && insertedRows.length > 0) {
      const { data: freshRows } = await supabase
        .from('leak_alerts')
        .select('id,source_url,notes')
        .eq('user_id', userId)
        .in(
          'id',
          insertedRows.map((r: { id: string }) => r.id),
        )

      const toScrape: Array<{ id: string; source_url: string; notes: string | null }> = []
      for (const row of freshRows || []) {
        const n = safeJsonParse(row.notes || '{}')
        const sev = n.grok?.severity as string | undefined
        if (sev === 'critical' || sev === 'high') {
          toScrape.push(row)
          if (toScrape.length >= scrapeMaxPages) break
        }
      }

      if (toScrape.length > 0) {
        const items: Array<{ url: string; pageExcerpt: string; title?: string; snippet?: string }> = []
        for (const row of toScrape) {
          const n = safeJsonParse(row.notes || '{}')
          const excerpt = await fetchPageTextExcerpt(row.source_url)
          if (excerpt) {
            items.push({
              url: row.source_url,
              pageExcerpt: excerpt,
              title: n.title,
              snippet: n.snippet,
            })
          }
        }

        if (items.length > 0) {
          try {
            const verified = await verifyLeakPagesWithGrok({
              apiKey: grokKey,
              items,
              knownHandles: usernames,
              knownTitlesSample: mergedTitles.slice(0, 20),
            })
            const byUrlV = new Map(verified.map((v) => [v.url, v]))
            for (const row of toScrape) {
              const v = byUrlV.get(row.source_url)
              if (!v) continue
              const n = safeJsonParse(row.notes || '{}')
              const nextNotes = {
                ...n,
                pageVerify: {
                  verifiedLikelyMatch: v.verifiedLikelyMatch,
                  rationale: v.rationale,
                  checkedAt: new Date().toISOString(),
                },
              }
              await supabase.from('leak_alerts').update({ notes: JSON.stringify(nextNotes) }).eq('id', row.id)
              pageVerifyCount++
            }
          } catch {
            // best-effort
          }
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
    pageVerifyCount: pageVerifyCount > 0 ? pageVerifyCount : undefined,
  }
}
