import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  type MimicProfileV1,
  parseMimicProfile,
  DEFAULT_MIMIC_PROFILE,
} from '@/lib/divine/mimic-types'

const MAX_EXEMPLAR = 5
const MAX_EXEMPLAR_LEN = 1200
const MAX_STR_ARR_ITEMS = 40
const MAX_STR_LEN = 200

function clampStr(s: string, max: number): string {
  return s.trim().slice(0, max)
}

function sanitizeStringArray(arr: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(arr)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const x of arr) {
    if (typeof x !== 'string') continue
    const t = clampStr(x, maxLen)
    if (!t) continue
    const k = t.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(t)
    if (out.length >= maxItems) break
  }
  return out
}

function sanitizeBody(body: Record<string, unknown>): MimicProfileV1 {
  const n = (v: unknown, d: number, min: number, max: number) => {
    const x = typeof v === 'number' ? v : Number(v)
    if (!Number.isFinite(x)) return d
    return Math.min(max, Math.max(min, Math.round(x)))
  }
  const b = body as Partial<MimicProfileV1>
  const exemplarRaw = Array.isArray(b.exemplarReplies) ? b.exemplarReplies : []
  const exemplar: string[] = []
  for (const x of exemplarRaw) {
    if (typeof x !== 'string') continue
    const t = x.trim().slice(0, MAX_EXEMPLAR_LEN)
    if (t) exemplar.push(t)
    if (exemplar.length >= MAX_EXEMPLAR) break
  }

  return {
    version: 1,
    completedSteps: Array.isArray(b.completedSteps)
      ? b.completedSteps.filter((x): x is number => typeof x === 'number' && x >= 0 && x < 20)
      : undefined,
    consentFanFacingDrafts: Boolean(b.consentFanFacingDrafts),
    neverSendWithoutReview: b.neverSendWithoutReview !== false,
    toneWarmth: n(b.toneWarmth, DEFAULT_MIMIC_PROFILE.toneWarmth!, 1, 5),
    flirtCeiling: n(b.flirtCeiling, DEFAULT_MIMIC_PROFILE.flirtCeiling!, 1, 5),
    humorLevel: n(b.humorLevel, DEFAULT_MIMIC_PROFILE.humorLevel!, 1, 5),
    humanizationLevel: n(b.humanizationLevel, DEFAULT_MIMIC_PROFILE.humanizationLevel!, 0, 3),
    tabooTopics: sanitizeStringArray(b.tabooTopics, MAX_STR_ARR_ITEMS, MAX_STR_LEN),
    bannedPhrases: sanitizeStringArray(b.bannedPhrases, MAX_STR_ARR_ITEMS, MAX_STR_LEN),
    signaturePhrases: sanitizeStringArray(b.signaturePhrases, 20, MAX_STR_LEN),
    exemplarReplies: exemplar,
    escalateOnKeywords: sanitizeStringArray(b.escalateOnKeywords, MAX_STR_ARR_ITEMS, MAX_STR_LEN),
    escalateFirstTimeDm: b.escalateFirstTimeDm !== false,
    escalateWhale: b.escalateWhale !== false,
    notes: typeof b.notes === 'string' ? clampStr(b.notes, 2000) : undefined,
    updatedAt: new Date().toISOString(),
  }
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: row, error } = await supabase
    .from('divine_manager_settings')
    .select('mimic_profile')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const parsed = parseMimicProfile((row as { mimic_profile?: unknown } | null)?.mimic_profile)
  return NextResponse.json({ mimic_profile: parsed ?? DEFAULT_MIMIC_PROFILE })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const mimic_profile = sanitizeBody(body)

  const { error } = await supabase.from('divine_manager_settings').upsert(
    {
      user_id: user.id,
      mimic_profile: mimic_profile as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, mimic_profile })
}
