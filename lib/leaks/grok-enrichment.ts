export type GrokLeakEnrichment = {
  url: string
  likelyLeak: boolean
  severity?: 'critical' | 'high' | 'medium' | 'low'
  rationale?: string
  contactHint?: string
}

export async function enrichWithGrok(opts: {
  apiKey: string
  items: Array<{ url: string; query?: string; title?: string; snippet?: string }>
}): Promise<GrokLeakEnrichment[]> {
  const { apiKey, items } = opts
  if (items.length === 0) return []

  const system =
    'You help identify likely leaked creator content links. Return concise structured JSON only.'

  const prompt = `For each item, classify whether it is likely a leaked repost of a creator's paid content.\n\nReturn JSON array with objects:\n- url (string)\n- likelyLeak (boolean)\n- severity (one of critical/high/medium/low)\n- rationale (short string)\n- contactHint (short string; where to send DMCA/abuse if obvious, e.g., "Cloudflare abuse form", "Reddit report", "Telegram channel admin", "Hosting provider abuse@")\n\nItems:\n${JSON.stringify(items, null, 2)}`

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // Updated Grok model; old 'grok-2-latest' is deprecated
      model: 'grok-2-1212',
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
    throw new Error(`Grok enrichment error (${res.status}): ${text.slice(0, 200)}`)
  }

  const data: any = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content || typeof content !== 'string') return []

  try {
    const parsed = JSON.parse(content)
    const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.items) ? parsed.items : []
    return (arr as any[])
      .filter((x) => x && typeof x.url === 'string')
      .map((x) => ({
        url: x.url,
        likelyLeak: Boolean(x.likelyLeak),
        severity: x.severity,
        rationale: x.rationale,
        contactHint: x.contactHint,
      }))
  } catch {
    return []
  }
}

