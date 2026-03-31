import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import {
  type MimicProfileV1,
  parseMimicProfile,
  DEFAULT_MIMIC_PROFILE,
} from '@/lib/divine/mimic-types'

export const maxDuration = 60

type ChatTurn = { role: 'user' | 'assistant' | 'system'; content: string }

function turnsFromAnswers(answers: Record<string, string>): string {
  const lines: string[] = []
  for (const [k, v] of Object.entries(answers)) {
    if (typeof v === 'string' && v.trim()) lines.push(`${k}: ${v.trim()}`)
  }
  return lines.join('\n')
}

function summarizeForPrompt(p: MimicProfileV1): string {
  return JSON.stringify({
    toneWarmth: p.toneWarmth,
    flirtCeiling: p.flirtCeiling,
    humorLevel: p.humorLevel,
    humanizationLevel: p.humanizationLevel,
    tabooTopics: p.tabooTopics,
    bannedPhrases: p.bannedPhrases,
    signaturePhrases: p.signaturePhrases,
    exemplarCount: (p.exemplarReplies ?? []).length,
    escalateOnKeywords: p.escalateOnKeywords,
  })
}

/**
 * POST — LLM merges interview answers / chat into a MimicProfileV1 patch (client persists via PATCH mimic-profile).
 */
export async function POST(req: NextRequest) {
  const supabase = await createRouteHandlerClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'Mimic interview requires OPENAI_API_KEY' }, { status: 503 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    messages?: ChatTurn[]
    answers?: Record<string, string>
    currentProfile?: Partial<MimicProfileV1>
  }

  const { data: row } = await supabase
    .from('divine_manager_settings')
    .select('mimic_profile')
    .eq('user_id', user.id)
    .maybeSingle()

  const stored = parseMimicProfile((row as { mimic_profile?: unknown } | null)?.mimic_profile)
  const base: MimicProfileV1 = {
    ...(stored ?? DEFAULT_MIMIC_PROFILE),
    ...(body.currentProfile && typeof body.currentProfile === 'object' ? body.currentProfile : {}),
    version: 1,
  }

  let interviewBlock = ''
  if (Array.isArray(body.messages) && body.messages.length > 0) {
    interviewBlock = body.messages
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m) => `${m.role.toUpperCase()}: ${m.content.trim()}`)
      .join('\n')
      .slice(0, 12000)
  } else if (body.answers && typeof body.answers === 'object') {
    interviewBlock = turnsFromAnswers(body.answers).slice(0, 12000)
  }

  if (!interviewBlock.trim()) {
    return NextResponse.json({ error: 'Provide messages[] or answers{}' }, { status: 400 })
  }

  const { gateway } = await import('@ai-sdk/gateway')
  const { text } = await generateText({
    model: gateway('openai/gpt-4o-mini'),
    temperature: 0.25,
    maxOutputTokens: 2000,
    prompt: `You refine a "Mimic" profile for an adult creator's fan DM voice (legal adults only, platform rules).

Current profile snapshot:
${summarizeForPrompt(base)}

Creator interview (answers or chat):
${interviewBlock}

Output VALID JSON ONLY (no markdown), shape:
{
  "mimic_profile_patch": {
    "toneWarmth"?: number (1-5),
    "flirtCeiling"?: number (1-5),
    "humorLevel"?: number (1-5),
    "humanizationLevel"?: number (0-3),
    "tabooTopics"?: string[],
    "bannedPhrases"?: string[],
    "signaturePhrases"?: string[],
    "exemplarReplies"?: string[] (max 3 short strings, new suggestions only if clearly implied),
    "escalateOnKeywords"?: string[],
    "notes"?: string
  },
  "aiInterviewSummary": string (2-4 sentences, what changed and why),
  "interviewTranscript": { "q": string, "a": string }[] (optional; canonical Q&A if you can infer questions from answers)
}

Rules:
- Only include keys you are confident about; omit unknowns.
- tabooTopics, bannedPhrases, signaturePhrases, escalateOnKeywords: max 12 items each, short phrases.
- Respectful; no minors; no illegal content.
- exemplarReplies: only if the interview contains clear example lines; else omit.`,
  })

  let mimic_profile_patch: Partial<MimicProfileV1> = {}
  let aiInterviewSummary: string | undefined
  let interviewTranscript: { q: string; a: string }[] | undefined
  try {
    const cleaned = text.trim().replace(/^```json\s*|\s*```$/g, '')
    const parsed = JSON.parse(cleaned) as {
      mimic_profile_patch?: unknown
      aiInterviewSummary?: unknown
      interviewTranscript?: unknown
    }
    if (parsed.mimic_profile_patch && typeof parsed.mimic_profile_patch === 'object') {
      mimic_profile_patch = parsed.mimic_profile_patch as Partial<MimicProfileV1>
    }
    if (typeof parsed.aiInterviewSummary === 'string') {
      aiInterviewSummary = parsed.aiInterviewSummary.trim().slice(0, 4000)
    }
    if (Array.isArray(parsed.interviewTranscript)) {
      interviewTranscript = parsed.interviewTranscript
        .map((row) => {
          if (!row || typeof row !== 'object') return null
          const r = row as Record<string, unknown>
          const q = typeof r.q === 'string' ? r.q.slice(0, 2000) : ''
          const a = typeof r.a === 'string' ? r.a.slice(0, 2000) : ''
          return q || a ? { q, a } : null
        })
        .filter((x): x is { q: string; a: string } => x != null)
        .slice(0, 40)
    }
  } catch {
    return NextResponse.json({ error: 'Model returned invalid JSON' }, { status: 502 })
  }

  return NextResponse.json({
    mimic_profile_patch,
    aiInterviewSummary,
    interviewTranscript,
  })
}
