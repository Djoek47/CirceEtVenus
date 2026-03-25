export type LeakUrgency = 'immediate' | 'soon' | 'backlog'

export type GrokLeakEnrichment = {
  url: string
  likelyLeak: boolean
  severity?: 'critical' | 'high' | 'medium' | 'low'
  /** Triage order for DMCA review */
  urgency?: LeakUrgency
  /** 0–1 confidence this link is infringing */
  confidence?: number
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

  const prompt = `For each item, classify whether it is likely a leaked repost of a creator's paid content.\n\nReturn a JSON object with key "items" whose value is an array of objects with:\n- url (string)\n- likelyLeak (boolean)\n- severity (one of critical/high/medium/low)\n- urgency (one of immediate/soon/backlog): immediate = act today if likely leak; soon = this week; backlog = lower priority\n- confidence (number 0 to 1): how sure this URL is actually infringing\n- rationale (short string)\n- contactHint (short string; where to send DMCA/abuse if obvious, e.g., "Cloudflare abuse form", "Reddit report", "Telegram channel admin", "Hosting provider abuse@")\n\nItems:\n${JSON.stringify(items, null, 2)}`

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
    throw new Error(`Grok enrichment error (${res.status}): ${text.slice(0, 200)}`)
  }

  const data: any = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content || typeof content !== 'string') return []

  try {
    const parsed: unknown = JSON.parse(content)
    const arr = Array.isArray(parsed)
      ? parsed
      : parsed &&
          typeof parsed === 'object' &&
          'items' in parsed &&
          Array.isArray((parsed as { items: unknown }).items)
        ? (parsed as { items: unknown[] }).items
        : []
    return (arr as any[])
      .filter((x) => x && typeof x.url === 'string')
      .map((x) => ({
        url: x.url,
        likelyLeak: Boolean(x.likelyLeak),
        severity: x.severity,
        urgency: ['immediate', 'soon', 'backlog'].includes(x.urgency) ? x.urgency : undefined,
        confidence: typeof x.confidence === 'number' ? Math.min(1, Math.max(0, x.confidence)) : undefined,
        rationale: x.rationale,
        contactHint: x.contactHint,
      }))
  } catch {
    return []
  }
}

