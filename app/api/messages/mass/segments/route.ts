import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

type FanRow = {
  creator_classification: string | null
  subscription_tier: string | null
  subscription_status: string | null
  total_spent: number | string | null
  platform: string
}

function buildAggregates(rows: FanRow[]) {
  const byClass = new Map<string, number>()
  const byTier = new Map<string, number>()
  const byStatus = new Map<string, number>()
  const byPlatform = new Map<string, number>()
  for (const r of rows) {
    const c = (r.creator_classification || '(unlabeled)').trim() || '(unlabeled)'
    byClass.set(c, (byClass.get(c) ?? 0) + 1)
    const t = (r.subscription_tier || '(none)').trim() || '(none)'
    byTier.set(t, (byTier.get(t) ?? 0) + 1)
    const s = (r.subscription_status || 'unknown').trim()
    byStatus.set(s, (byStatus.get(s) ?? 0) + 1)
    byPlatform.set(r.platform, (byPlatform.get(r.platform) ?? 0) + 1)
  }
  return {
    totalFans: rows.length,
    byClassification: Object.fromEntries(byClass),
    byTier: Object.fromEntries(byTier),
    byStatus: Object.fromEntries(byStatus),
    byPlatform: Object.fromEntries(byPlatform),
  }
}

export type MassSegmentSuggestion = {
  id: string
  name: string
  rationale: string
  /** Match hints for client-side counting */
  match: {
    creator_classifications?: string[]
    subscription_tiers?: string[]
    subscription_statuses?: string[]
    platforms?: string[]
    min_total_spent?: number
  }
  estimated_count_hint?: string
}

/**
 * POST — AI-suggested mass-message audience segments from CRM fans (classifications, tiers, spend).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Segment suggestions require OPENAI_API_KEY' }, { status: 503 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    goal?: string
    platform?: 'onlyfans' | 'fansly'
  }
  const goal = typeof body.goal === 'string' ? body.goal.trim().slice(0, 2000) : ''
  const platformFilter = body.platform === 'onlyfans' || body.platform === 'fansly' ? body.platform : undefined

  let q = supabase
    .from('fans')
    .select('creator_classification, subscription_tier, subscription_status, total_spent, platform')
    .eq('user_id', user.id)
    .limit(8000)

  if (platformFilter) q = q.eq('platform', platformFilter)

  const { data: fans, error } = await q

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (fans ?? []) as FanRow[]
  const aggregates = buildAggregates(rows)

  const { gateway } = await import('@ai-sdk/gateway')
  const { text } = await generateText({
    model: gateway('openai/gpt-4o-mini'),
    temperature: 0.25,
    maxOutputTokens: 1800,
    prompt: `You help an adult creator target mass DMs. Given aggregate fan CRM stats, propose 5–8 audience segments for messaging campaigns.

Creator goal (may be empty):
${goal || '(general engagement / retention)'}

Aggregates (JSON):
${JSON.stringify(aggregates)}

Output VALID JSON ONLY (no markdown):
{
  "segments": Array<{
    "id": string,
    "name": string,
    "rationale": string,
    "match": {
      "creator_classifications"?: string[],
      "subscription_tiers"?: string[],
      "subscription_statuses"?: string[],
      "platforms"?: string[],
      "min_total_spent"?: number
    },
    "estimated_count_hint": string
  }>
}

Rules:
- ids: lowercase slug with hyphens, unique.
- creator_classifications must use exact keys from byClassification in aggregates when possible (including "(unlabeled)" if useful).
- subscription_tiers: use keys from byTier when possible.
- subscription_statuses: only values that appear in byStatus.
- platforms: only keys from byPlatform.
- Rationale: one short sentence each.
- estimated_count_hint: rough range text (e.g. "~120 fans") based on aggregates, do not invent exact ids.
- Respectful adult-business tone; no minors/illegal content.`,
  })

  let segments: MassSegmentSuggestion[] = []
  try {
    const cleaned = text.trim().replace(/^```json\s*|\s*```$/g, '')
    const parsed = JSON.parse(cleaned) as { segments?: unknown }
    if (Array.isArray(parsed.segments)) {
      for (let i = 0; i < parsed.segments.length && segments.length < 12; i++) {
        const s = parsed.segments[i]
        if (!s || typeof s !== 'object') continue
        const o = s as Record<string, unknown>
        const id = typeof o.id === 'string' ? o.id.trim().slice(0, 80) : `segment-${i}`
        const name = typeof o.name === 'string' ? o.name.trim().slice(0, 120) : id
        const rationale = typeof o.rationale === 'string' ? o.rationale.trim().slice(0, 400) : ''
        const match: MassSegmentSuggestion['match'] =
          o.match && typeof o.match === 'object' ? (o.match as MassSegmentSuggestion['match']) : {}
        const item: MassSegmentSuggestion = { id, name, rationale, match }
        if (typeof o.estimated_count_hint === 'string') {
          item.estimated_count_hint = o.estimated_count_hint.trim().slice(0, 80)
        }
        segments.push(item)
      }
    }
  } catch {
    segments = []
  }

  return NextResponse.json({
    aggregates,
    segments,
  })
}
