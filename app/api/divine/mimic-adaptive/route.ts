import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import {
  type MimicProfileV1,
  parseMimicProfile,
  DEFAULT_MIMIC_PROFILE,
} from '@/lib/divine/mimic-types'

export const maxDuration = 60

function summarizeProfile(p: MimicProfileV1): string {
  const lines = [
    `consentFanFacingDrafts: ${p.consentFanFacingDrafts}`,
    `neverSendWithoutReview: ${p.neverSendWithoutReview !== false}`,
    `toneWarmth: ${p.toneWarmth ?? 3}, flirtCeiling: ${p.flirtCeiling ?? 2}, humor: ${p.humorLevel ?? 2}, humanization: ${p.humanizationLevel ?? 1}`,
    `tabooTopics: ${(p.tabooTopics ?? []).join('; ') || '—'}`,
    `bannedPhrases: ${(p.bannedPhrases ?? []).join('; ') || '—'}`,
    `exemplarCount: ${(p.exemplarReplies ?? []).length}`,
    `escalateOnKeywords: ${(p.escalateOnKeywords ?? []).join('; ') || '—'}`,
  ]
  return lines.join('\n')
}

/**
 * POST { draftProfile?: MimicProfileV1 } — generates 4–6 short adaptive follow-up questions from current mimic profile (DB + optional draft).
 */
export async function POST(req: NextRequest) {
  const supabase = await createRouteHandlerClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Mimic adaptive requires OPENAI_API_KEY' }, { status: 503 })
  }

  const body = (await req.json().catch(() => ({}))) as { draftProfile?: Partial<MimicProfileV1> }

  const { data: row } = await supabase
    .from('divine_manager_settings')
    .select('mimic_profile')
    .eq('user_id', user.id)
    .maybeSingle()

  const stored = parseMimicProfile((row as { mimic_profile?: unknown } | null)?.mimic_profile)
  const base = stored ?? DEFAULT_MIMIC_PROFILE
  const merged: MimicProfileV1 = {
    ...base,
    ...(body.draftProfile && typeof body.draftProfile === 'object' ? body.draftProfile : {}),
    version: 1,
  }

  const { gateway } = await import('@ai-sdk/gateway')
  const { text } = await generateText({
    model: gateway('openai/gpt-4o-mini'),
    temperature: 0.35,
    maxOutputTokens: 800,
    prompt: `You help an adult content creator refine how an AI should mimic their fan DM voice.

Creator Mimic profile summary:
${summarizeProfile(merged)}

Output VALID JSON ONLY (no markdown):
{ "questions": string[] }

Rules:
- Exactly 4 to 6 short questions (one sentence each).
- Questions should adapt to what's missing or ambiguous (e.g. boundaries, tone edge cases, how to handle tips/PPV, emoji usage).
- Professional; no illegal content; no minors.
- JSON array only in "questions".`,
  })

  let questions: string[] = []
  try {
    const parsed = JSON.parse(text.trim().replace(/^```json\s*|\s*```$/g, '')) as { questions?: unknown }
    if (Array.isArray(parsed.questions)) {
      questions = parsed.questions
        .filter((q): q is string => typeof q === 'string')
        .map((q) => q.trim())
        .filter(Boolean)
        .slice(0, 8)
    }
  } catch {
    questions = []
  }

  if (questions.length === 0) {
    questions = [
      'Are there any topics you want the AI to always hand off to you instead of replying?',
      'How direct should upsell/PPV hints be in casual chat?',
      'Do you prefer emojis and which density feels on-brand?',
    ]
  }

  return NextResponse.json({
    questions,
    generatedAt: new Date().toISOString(),
  })
}
