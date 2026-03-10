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
}): Promise<ReputationGrokEnrichment[]> {
  const { apiKey, items } = opts
  if (items.length === 0) return []

  const system =
    'You are Venus, goddess of attraction, analyzing online mentions of a creator. Return only JSON; no extra text.'

  const prompt = `For each mention, classify:\n- sentiment: positive | neutral | negative\n- category: short tag like \"praise\", \"criticism\", \"question\", \"nsfw review\", etc.\n- rationale: short explanation\n- suggestedReply: a short, in-character reply that improves reputation and engagement.\n\nReturn JSON array like:\n[\n  { \"id\": \"...\", \"url\": \"...\", \"platform\": \"twitter\", \"sentiment\": \"positive\", \"category\": \"praise\", \"rationale\": \"...\", \"suggestedReply\": \"...\" }\n]\n\nMentions:\n${JSON.stringify(items, null, 2)}`

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-2-latest',
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

