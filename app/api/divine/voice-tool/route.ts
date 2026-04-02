import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { generateText } from 'ai'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { isDivineFullAccess } from '@/lib/divine/divine-full-access'
import { runToolCall } from '@/lib/divine/manager-chat-tools'
import {
  DEFAULT_MIMIC_PROFILE,
  parseMimicProfile,
  type MimicProfileV1,
} from '@/lib/divine/mimic-types'

/**
 * OnlyFans + AI tools can exceed default Vercel limits (often 10s on Hobby).
 * Raise in Vercel Project → Functions if this route 504s. Pro/Enterprise supports up to 800s.
 */
export const maxDuration = 120

type MimicQa = { q: string; a: string }

function sanitizeTurn(text: unknown, max = 2000): string {
  return typeof text === 'string' ? text.trim().slice(0, max) : ''
}

async function runMimicInterviewRefinement(
  currentProfile: MimicProfileV1,
  messages: { role: 'assistant' | 'user'; content: string }[],
) {
  const { gateway } = await import('@ai-sdk/gateway')
  const interviewBlock = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n')
    .slice(0, 12000)

  const { text } = await generateText({
    model: gateway('openai/gpt-4o-mini'),
    temperature: 0.25,
    maxOutputTokens: 2000,
    prompt: `You refine a Mimic profile for adult creator fan DMs.

Current profile:
${JSON.stringify({
  toneWarmth: currentProfile.toneWarmth,
  flirtCeiling: currentProfile.flirtCeiling,
  humorLevel: currentProfile.humorLevel,
  humanizationLevel: currentProfile.humanizationLevel,
  tabooTopics: currentProfile.tabooTopics,
  bannedPhrases: currentProfile.bannedPhrases,
  signaturePhrases: currentProfile.signaturePhrases,
  exemplarCount: (currentProfile.exemplarReplies ?? []).length,
  escalateOnKeywords: currentProfile.escalateOnKeywords,
})}

Interview:
${interviewBlock}

Output JSON only:
{
  "mimic_profile_patch": {
    "toneWarmth"?: number,
    "flirtCeiling"?: number,
    "humorLevel"?: number,
    "humanizationLevel"?: number,
    "tabooTopics"?: string[],
    "bannedPhrases"?: string[],
    "signaturePhrases"?: string[],
    "exemplarReplies"?: string[],
    "escalateOnKeywords"?: string[],
    "notes"?: string
  },
  "aiInterviewSummary": string
}

Rules: legal adults only, no minors, no illegal suggestions, concise.`,
  })

  const cleaned = text.trim().replace(/^```json\s*|\s*```$/g, '')
  const parsed = JSON.parse(cleaned) as {
    mimic_profile_patch?: Partial<MimicProfileV1>
    aiInterviewSummary?: string
  }
  return {
    patch:
      parsed.mimic_profile_patch && typeof parsed.mimic_profile_patch === 'object'
        ? parsed.mimic_profile_patch
        : ({} as Partial<MimicProfileV1>),
    summary:
      typeof parsed.aiInterviewSummary === 'string'
        ? parsed.aiInterviewSummary.slice(0, 4000)
        : 'Interview processed.',
  }
}

/**
 * POST: run a single Divine Manager tool with the same logic as text chat (for Realtime voice).
 * Body: { name: string, arguments?: Record<string, unknown> }
 * Returns `ui_actions` unchanged from `runToolCall` — client applies via `applyUiActionsFromTools` (idempotent focus).
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as {
      name?: string
      arguments?: Record<string, unknown>
    }
    const name = typeof body.name === 'string' ? body.name : ''
    if (!name.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })

    const args = body.arguments && typeof body.arguments === 'object' ? body.arguments : {}

    if (name === 'mimic_record_answer') {
      const q = sanitizeTurn((args as { question?: unknown }).question)
      const a = sanitizeTurn((args as { answer?: unknown }).answer)
      if (!q || !a) {
        return NextResponse.json({ error: 'question and answer are required' }, { status: 400 })
      }

      const { data: row } = await supabase
        .from('mimic_test_sessions')
        .select('answers_json')
        .eq('user_id', user.id)
        .maybeSingle()

      const answers =
        ((row as { answers_json?: Record<string, unknown> } | null)?.answers_json ?? {}) as Record<
          string,
          unknown
        >
      const transcriptRaw = Array.isArray(answers.interviewTranscript)
        ? answers.interviewTranscript
        : []
      const transcript: MimicQa[] = transcriptRaw
        .map((r) => {
          if (!r || typeof r !== 'object') return null
          const o = r as Record<string, unknown>
          const qq = sanitizeTurn(o.q)
          const aa = sanitizeTurn(o.a)
          if (!qq || !aa) return null
          return { q: qq, a: aa }
        })
        .filter((x): x is MimicQa => x != null)
        .slice(-59)
      transcript.push({ q, a })

      const nextAnswers = {
        ...answers,
        interviewTranscript: transcript,
        updatedAt: new Date().toISOString(),
      }
      const { error } = await supabase.from('mimic_test_sessions').upsert(
        {
          user_id: user.id,
          profile_json: {},
          answers_json: nextAnswers,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({
        content: `Saved answer ${transcript.length}. Continue the interview.`,
      })
    }

    if (name === 'mimic_finalize_interview') {
      if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json(
          { error: 'Mimic interview requires OPENAI_API_KEY' },
          { status: 503 },
        )
      }
      const [{ data: settingsRow }, { data: sessionRow }] = await Promise.all([
        supabase
          .from('divine_manager_settings')
          .select('mimic_profile')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('mimic_test_sessions')
          .select('answers_json')
          .eq('user_id', user.id)
          .maybeSingle(),
      ])

      const base =
        parseMimicProfile(
          (settingsRow as { mimic_profile?: unknown } | null)?.mimic_profile,
        ) ?? DEFAULT_MIMIC_PROFILE
      const answersJson =
        ((sessionRow as { answers_json?: Record<string, unknown> } | null)?.answers_json ??
          {}) as Record<string, unknown>
      const transcriptRaw = Array.isArray(answersJson.interviewTranscript)
        ? answersJson.interviewTranscript
        : []
      const transcript: MimicQa[] = transcriptRaw
        .map((r) => {
          if (!r || typeof r !== 'object') return null
          const o = r as Record<string, unknown>
          const q = sanitizeTurn(o.q)
          const a = sanitizeTurn(o.a)
          if (!q || !a) return null
          return { q, a }
        })
        .filter((x): x is MimicQa => x != null)

      if (transcript.length === 0) {
        return NextResponse.json({
          content: 'No interview answers found yet. Ask at least one question first.',
        })
      }

      const messages = transcript.flatMap((t) => [
        { role: 'assistant' as const, content: t.q },
        { role: 'user' as const, content: t.a },
      ])
      const refined = await runMimicInterviewRefinement(base, messages)
      const merged: MimicProfileV1 = {
        ...base,
        ...refined.patch,
        version: 1,
        aiInterviewSummary: refined.summary,
        aiInterviewAt: new Date().toISOString(),
        interviewTranscript: transcript,
      }
      const { error: upErr } = await supabase.from('divine_manager_settings').upsert(
        {
          user_id: user.id,
          mimic_profile: merged as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

      const { error: sessErr } = await supabase.from('mimic_test_sessions').upsert(
        {
          user_id: user.id,
          profile_json: merged as unknown as Record<string, unknown>,
          answers_json: {
            ...answersJson,
            interviewTranscript: transcript,
            finalizedAt: new Date().toISOString(),
            aiInterviewSummary: refined.summary,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      if (sessErr) return NextResponse.json({ error: sessErr.message }, { status: 500 })

      return NextResponse.json({
        content: `Interview finalized. ${refined.summary}`,
      })
    }

    const fromHeader = req.headers.get('cookie') || ''
    const jar = await cookies()
    const fromJar = jar.getAll().map((c) => `${c.name}=${c.value}`).join('; ')
    const cookie = fromHeader || fromJar
    const { ok: divineFull } = await isDivineFullAccess(supabase, user.id)

    const result = await runToolCall(
      {
        id: 'voice',
        function: { name, arguments: JSON.stringify(args) },
      },
      { cookie, supabase, userId: user.id, divineFull },
    )

    return NextResponse.json({
      content: result.content,
      ui_actions: result.uiActions,
      pending_confirmations: result.pendingConfirmations,
      lookup_meta: result.lookupMeta ?? undefined,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Voice tool failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
