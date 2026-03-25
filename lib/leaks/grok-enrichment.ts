export type LeakUrgency = 'immediate' | 'soon' | 'backlog'

export type EvidenceAccessibility = 'public_snippet' | 'likely_paywall_or_sign_in' | 'unknown'

export type LeakReviewConclusion =
  | 'likely_infringing'
  | 'non_conclusive'
  | 'non_conclusive_needs_access'

export type SuggestedLeakUserAction =
  | 'review_when_signed_in'
  | 'dmca_if_confirmed_match'
  | 'monitor'
  | 'ignore_if_intentionally_public'

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
  /** From title/snippet only — you do not see authenticated pages */
  evidenceAccessibility?: EvidenceAccessibility
  reviewConclusion?: LeakReviewConclusion
  /** Free vs paid surfaces, cross-platform consent ambiguity — not legal advice */
  distributionNuance?: string
  suggestedUserAction?: SuggestedLeakUserAction
}

function normEvidence(v: unknown): EvidenceAccessibility | undefined {
  if (v === 'public_snippet' || v === 'likely_paywall_or_sign_in' || v === 'unknown') return v
  return undefined
}

function normConclusion(v: unknown): LeakReviewConclusion | undefined {
  if (
    v === 'likely_infringing' ||
    v === 'non_conclusive' ||
    v === 'non_conclusive_needs_access'
  )
    return v
  return undefined
}

function normSuggestedAction(v: unknown): SuggestedLeakUserAction | undefined {
  if (
    v === 'review_when_signed_in' ||
    v === 'dmca_if_confirmed_match' ||
    v === 'monitor' ||
    v === 'ignore_if_intentionally_public'
  )
    return v
  return undefined
}

export async function enrichWithGrok(opts: {
  apiKey: string
  items: Array<{ url: string; query?: string; title?: string; snippet?: string }>
}): Promise<GrokLeakEnrichment[]> {
  const { apiKey, items } = opts
  if (items.length === 0) return []

  const system =
    'You help triage likely leaked creator content from search snippets only. You cannot see paywalled or sign-in-only pages. Return concise structured JSON only. Do not assert legal conclusions; describe uncertainty when evidence is only ads or teasers.'

  const prompt = `For each item, assess whether it is likely a leaked repost of a creator's paid or exclusive content.

You only see the URL, optional title, and search snippet — not authenticated or paywalled page bodies. If the snippet suggests subscription, paywall, or sign-in is required to view the alleged infringement, say so: you cannot confirm infringement without access.

Return a JSON object with key "items" whose value is an array of objects with:
- url (string)
- likelyLeak (boolean)
- severity (one of critical/high/medium/low)
- urgency (one of immediate/soon/backlog): immediate = act today if likely leak; soon = this week; backlog = lower priority
- confidence (number 0 to 1): how sure this URL is actually infringing given only public evidence
- rationale (short string)
- contactHint (short string; where to send DMCA/abuse if obvious, e.g. "Cloudflare abuse form", "Reddit report")
- evidenceAccessibility (one of: public_snippet | likely_paywall_or_sign_in | unknown) — whether the evidence looks like a public snippet vs likely gated content
- reviewConclusion (one of: likely_infringing | non_conclusive | non_conclusive_needs_access)
- distributionNuance (short string): e.g. same promo free on one platform vs paid elsewhere; ambiguous cross-post consent; stolen to another site — state when you cannot know from snippets
- suggestedUserAction (one of: review_when_signed_in | dmca_if_confirmed_match | monitor | ignore_if_intentionally_public)

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
        rationale: typeof x.rationale === 'string' ? x.rationale : undefined,
        contactHint: typeof x.contactHint === 'string' ? x.contactHint : undefined,
        evidenceAccessibility: normEvidence(x.evidenceAccessibility),
        reviewConclusion: normConclusion(x.reviewConclusion),
        distributionNuance:
          typeof x.distributionNuance === 'string' ? x.distributionNuance.slice(0, 1200) : undefined,
        suggestedUserAction: normSuggestedAction(x.suggestedUserAction),
      }))
  } catch {
    return []
  }
}
