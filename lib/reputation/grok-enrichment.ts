export type ReputationGrokEnrichment = {
  id?: string
  url: string
  platform?: string
  sentiment: 'positive' | 'neutral' | 'negative'
  category?: string
  rationale?: string
  suggestedReply?: string
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

  const nicheContext = niches && niches.length
    ? `Creator niches/tone: ${niches.join(', ')}.\nTreat these as normal for the brand, but still follow all safety rules.`
    : 'Creator niches/tone: generic adult creator. Follow safety rules.'

  const prompt = `For each mention, classify:
- sentiment: positive | neutral | negative
- category: short tag like \"praise\", \"criticism\", \"question\", \"nsfw review\", etc.
- rationale: short explanation
- suggestedReply: a short, in-character reply that improves reputation and engagement, matching the creator's niche and boundaries.

${nicheContext}

Return JSON array like:
[
  { "id": "...", "url": "...", "platform": "twitter", "sentiment": "positive", "category": "praise", "rationale": "...", "suggestedReply": "..." }
]

Mentions:
${JSON.stringify(items, null, 2)}`

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // Updated Grok model; old grok-2-* models are deprecated
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
      }))
  } catch {
    return []
  }
}

