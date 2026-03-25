/**
 * Aggregate reputation briefing from recent mentions (Pro / Grok).
 * Mentions are search-index snippets, not live social APIs.
 */

export type ReputationBriefingWatchItem = {
  url: string
  title?: string | null
  snippet: string
  note?: string
}

export type ReputationBriefingPayload = {
  headline: string
  summary: string
  themesPositive: string[]
  themesNegative: string[]
  /** High-risk / hostile — UI copy avoids "hater" legally */
  watchlist: ReputationBriefingWatchItem[]
  opportunities: ReputationBriefingWatchItem[]
  overallNextSteps: string[]
  disclaimer: string
}

const MODEL = 'grok-4-1-fast-reasoning'

/** Optional creator identity for prompts when indexed snippets are missing or sparse. */
export type ReputationBriefingIdentity = {
  manualHandles: string[]
  displayName?: string | null
  platformHandles?: Record<string, string> | null
}

function formatIdentityBlock(identity: ReputationBriefingIdentity | undefined): string {
  if (!identity) return ''
  const handles = identity.manualHandles?.filter(Boolean) ?? []
  const plat = identity.platformHandles
  const platStr =
    plat && typeof plat === 'object'
      ? Object.entries(plat)
          .map(([k, v]) => `${k}: ${v}`)
          .join('; ')
      : ''
  const lines = [
    handles.length ? `Manual / merged search handles: ${handles.join(', ')}.` : '',
    identity.displayName?.trim() ? `Display or stage name (for context only): ${identity.displayName.trim()}.` : '',
    platStr ? `Platform usernames on file: ${platStr}.` : '',
  ].filter(Boolean)
  if (!lines.length) return ''
  return `Creator identity context (for query targeting—not verified legal identity):\n${lines.join('\n')}\n`
}

export async function compileReputationBriefing(opts: {
  apiKey: string
  mentions: Array<{
    id: string
    source_url: string
    title?: string | null
    content_preview: string
    platform?: string | null
    sentiment?: string | null
    ai_category?: string | null
    ai_rationale?: string | null
    ai_reputation_impact?: string | null
    ai_recommended_action?: string | null
    scan_channel?: string | null
  }>
  niches?: string[]
  identity?: ReputationBriefingIdentity
}): Promise<ReputationBriefingPayload | null> {
  const { apiKey, mentions, niches, identity } = opts

  const nicheContext =
    niches && niches.length
      ? `Creator niches: ${niches.join(', ')}.`
      : 'Creator: adult/creator brand. Keep tone mythic (Venus/Circe) but professional.'

  const system =
    'You are Venus from Circe & Venus: a sharp, glamorous reputation strategist. Return only JSON. Never invent specific URLs or quotes you did not receive in input. Do not defame real individuals.'

  const identityBlock = formatIdentityBlock(identity)

  const user =
    mentions.length === 0
      ? `${nicheContext}

There are NO stored index snippets yet for this creator in the last window (or discovery returned no hits). You must still return a complete JSON object.

Explain honestly that indexed discovery has not surfaced items yet (or the creator has not run Refresh Vision). themesPositive and themesNegative may be shorter (1-3 items) and can describe what to monitor in general terms, not fabricated incidents.

watchlist and opportunities may be empty arrays [] if there is no real URL data.

overallNextSteps MUST include practical bullets such as: run Refresh Vision on the Mentions page, confirm manual search handles (OnlyFans/MYM/social @names) are saved, understand that snippets are not live social feeds, and revisit after the next scan.

${identityBlock}

Return JSON object with:
- headline: one compelling line (max 120 chars)
- summary: 2-4 sentences
- themesPositive: string[]
- themesNegative: string[]
- watchlist: array of { url, title (optional), snippet, note } — empty array if no real URLs in input
- opportunities: same — empty array if none
- overallNextSteps: string[] (3-7 bullets; include scanning / handle hygiene / limitations of snippet-only discovery)
- disclaimer: one sentence that results are from indexed discovery only and the creator decides all responses

Input mentions (empty array):
[]`
      : `${nicheContext}

Data is from web search index snippets (not live APIs). Summarize for the creator.

${identityBlock}

Return JSON object with:
- headline: one compelling line (max 120 chars)
- summary: 2-4 sentences on overall reputation picture
- themesPositive: string[] (2-5 short bullets — wins, praise, goodwill)
- themesNegative: string[] (2-5 short bullets — criticisms, rumors, risks — factual not defamatory toward unnamed third parties)
- watchlist: array of { url, title (optional), snippet (short excerpt), note (why high-risk: harassment, defamation risk, brigading, etc.) } — prioritize harmful impact or report-worthy items; max 8
- opportunities: array of same shape for reply-worthy or engagement moments; max 8
- overallNextSteps: string[] (3-7 actionable bullets: reply, report, monitor, ignore)
- disclaimer: one sentence that results are from indexed discovery and the creator decides all public responses

Input mentions (JSON):
${JSON.stringify(
  mentions.map((m) => ({
    id: m.id,
    url: m.source_url,
    title: m.title,
    snippet: (m.content_preview || '').slice(0, 400),
    platform: m.platform,
    sentiment: m.sentiment,
    category: m.ai_category,
    rationale: m.ai_rationale,
    reputationImpact: m.ai_reputation_impact,
    recommendedAction: m.ai_recommended_action,
    scanChannel: m.scan_channel,
  })),
  null,
  2,
)}`

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.25,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Grok briefing error (${res.status}): ${text.slice(0, 200)}`)
  }

  const data: unknown = await res.json()
  const content = (data as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]?.message
    ?.content
  if (!content || typeof content !== 'string') return null

  try {
    const parsed = JSON.parse(content) as Record<string, unknown>
    const headline = typeof parsed.headline === 'string' ? parsed.headline : 'Reputation snapshot'
    const summary = typeof parsed.summary === 'string' ? parsed.summary : ''
    const themesPositive = Array.isArray(parsed.themesPositive)
      ? (parsed.themesPositive as unknown[]).filter((x): x is string => typeof x === 'string')
      : []
    const themesNegative = Array.isArray(parsed.themesNegative)
      ? (parsed.themesNegative as unknown[]).filter((x): x is string => typeof x === 'string')
      : []
    const watchlist = normalizeItems(parsed.watchlist)
    const opportunities = normalizeItems(parsed.opportunities)
    const overallNextSteps = Array.isArray(parsed.overallNextSteps)
      ? (parsed.overallNextSteps as unknown[]).filter((x): x is string => typeof x === 'string')
      : []
    const disclaimer =
      typeof parsed.disclaimer === 'string'
        ? parsed.disclaimer
        : 'Discovery comes from public search indexes; you choose every reply and report.'

    return {
      headline: headline.slice(0, 200),
      summary,
      themesPositive,
      themesNegative,
      watchlist,
      opportunities,
      overallNextSteps,
      disclaimer,
    }
  } catch {
    return null
  }
}

function normalizeItems(raw: unknown): ReputationBriefingWatchItem[] {
  if (!Array.isArray(raw)) return []
  const out: ReputationBriefingWatchItem[] = []
  for (const x of raw) {
    if (!x || typeof x !== 'object') continue
    const o = x as Record<string, unknown>
    const url = typeof o.url === 'string' ? o.url : ''
    if (!url) continue
    out.push({
      url,
      title: typeof o.title === 'string' ? o.title : null,
      snippet: typeof o.snippet === 'string' ? o.snippet.slice(0, 500) : '',
      note: typeof o.note === 'string' ? o.note : undefined,
    })
  }
  return out.slice(0, 10)
}
