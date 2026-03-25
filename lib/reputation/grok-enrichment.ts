export type ReputationImpact = 'harmful' | 'helpful' | 'neutral'
export type RecommendedReputationAction = 'reply' | 'report' | 'monitor' | 'ignore'

export type ReputationGrokEnrichment = {
  id?: string
  url: string
  platform?: string
  sentiment: 'positive' | 'neutral' | 'negative'
  category?: string
  rationale?: string
  suggestedReply?: string
  reputationImpact?: ReputationImpact
  recommendedAction?: RecommendedReputationAction
}

function normalizeImpact(v: unknown): ReputationImpact | undefined {
  if (v === 'harmful' || v === 'helpful' || v === 'neutral') return v
  return undefined
}

function normalizeAction(v: unknown): RecommendedReputationAction | undefined {
  if (v === 'reply' || v === 'report' || v === 'monitor' || v === 'ignore') return v
  return undefined
}

export async function enrichReputationWithGrok(opts: {
  apiKey: string
  items: Array<{ id?: string; url: string; platform?: string; content: string }>
  niches?: string[]
}): Promise<ReputationGrokEnrichment[]> {
  const { apiKey, items, niches } = opts
  if (items.length === 0) return []

  const system =
    'You are Venus, goddess of attraction, analyzing online mentions of a creator. Return only JSON; no extra text.'

  const nicheContext =
    niches && niches.length
      ? `Creator niches/tone: ${niches.join(', ')}.\nTreat these as normal for the brand, but still follow all safety rules.`
      : 'Creator niches/tone: generic adult creator. Follow safety rules.'

  const prompt = `For each mention, classify:
- sentiment: positive | neutral | negative
- category: short tag like "praise", "criticism", "question", "nsfw review", etc.
- rationale: short explanation
- reputationImpact: harmful | helpful | neutral — does this mention damage or improve the creator's reputation in the public eye?
- recommendedAction: reply | report | monitor | ignore
  - reply: worth engaging with a public or private response
  - report: likely abuse, harassment, defamation, or ToS violation — user should use the platform's report flow (not legal advice)
  - monitor: watch but no immediate action
  - ignore: low stakes or noise
- suggestedReply: if recommendedAction is reply, a short in-character reply that improves reputation and engagement. If recommendedAction is report, a one-line platform-agnostic note only (e.g. consider the platform's abuse or harassment reporting tools) — not legal advice. Otherwise null or omit.

${nicheContext}

Return JSON object: { "items": [ ... ] }
Each item:
{ "id": "...", "url": "...", "platform": "twitter", "sentiment": "positive", "category": "praise", "rationale": "...", "reputationImpact": "helpful", "recommendedAction": "reply", "suggestedReply": "..." }

Mentions:
${JSON.stringify(items, null, 2)}`

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-4-1-fast-reasoning',
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Grok reputation error (${res.status}): ${text.slice(0, 200)}`)
  }

  const data: any = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content || typeof content !== 'string') return []

  try {
    const parsed = JSON.parse(content)
    const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed.items) ? parsed.items : []
    return (arr as any[])
      .filter((x) => x && typeof x.url === 'string')
      .map((x) => ({
        id: x.id,
        url: x.url,
        platform: x.platform,
        sentiment: x.sentiment === 'positive' || x.sentiment === 'negative' ? x.sentiment : 'neutral',
        category: x.category,
        rationale: x.rationale,
        suggestedReply: x.suggestedReply,
        reputationImpact: normalizeImpact(x.reputationImpact),
        recommendedAction: normalizeAction(x.recommendedAction),
      }))
  } catch {
    return []
  }
}
