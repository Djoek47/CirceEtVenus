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
}): Promise<ReputationBriefingPayload | null> {
  const { apiKey, mentions, niches } = opts
  if (mentions.length === 0) return null

  const nicheContext =
    niches && niches.length
      ? `Creator niches: ${niches.join(', ')}.`
      : 'Creator: adult/creator brand. Keep tone mythic (Venus/Circe) but professional.'

  const system =
    'You are Venus from Circe & Venus: a sharp, glamorous reputation strategist. Return only JSON.'

  const user = `${nicheContext}

Data is from web search index snippets (not live APIs). Summarize for the creator.

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
