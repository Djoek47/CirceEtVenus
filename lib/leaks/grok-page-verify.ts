/**
 * Second-pass Grok check using fetched page text + known handles/titles.
 */
export type PageVerifyResult = {
  url: string
  verifiedLikelyMatch: boolean
  rationale?: string
}

export async function verifyLeakPagesWithGrok(opts: {
  apiKey: string
  items: Array<{
    url: string
    pageExcerpt: string
    title?: string
    snippet?: string
  }>
  knownHandles: string[]
  knownTitlesSample: string[]
}): Promise<PageVerifyResult[]> {
  const { apiKey, items, knownHandles, knownTitlesSample } = opts
  if (items.length === 0) return []

  const system =
    'You verify whether a web page likely hosts leaked paywalled creator content. Return JSON only.'

  const prompt = `Given HTML text excerpts (may be partial), decide if the page likely shows or distributes this creator's content without permission.

Known creator handles (sample): ${JSON.stringify(knownHandles.slice(0, 20))}
Known content title samples: ${JSON.stringify(knownTitlesSample.slice(0, 15))}

Return JSON object with key "items" — array of:
- url (string, must match input)
- verifiedLikelyMatch (boolean): true if excerpt + snippet suggest infringing redistribution
- rationale (short string)

Items:
${JSON.stringify(items, null, 2)}`

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-4-1-fast-reasoning',
      temperature: 0.15,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Grok page verify (${res.status}): ${text.slice(0, 200)}`)
  }

  const data: unknown = await res.json()
  const content = (data as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]?.message
    ?.content
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
    return (arr as Array<{ url?: string; verifiedLikelyMatch?: boolean; rationale?: string }>)
      .filter((x) => x && typeof x.url === 'string')
      .map((x) => ({
        url: x.url,
        verifiedLikelyMatch: Boolean(x.verifiedLikelyMatch),
        rationale: typeof x.rationale === 'string' ? x.rationale : undefined,
      }))
  } catch {
    return []
  }
}
