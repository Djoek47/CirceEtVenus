import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { getDivineVoice } from '@/lib/divine-manager'

export const maxDuration = 30

/**
 * POST: create a Realtime (WebRTC) session for Mimic Test voice interrogation.
 * Body: { sdp: string } or raw SDP body.
 * Returns: SDP answer string.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const baseUrl = process.env.OPENAI_BASE_URL?.replace(/\/$/, '') || 'https://api.openai.com'
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey || !apiKey.startsWith('sk-')) {
      return NextResponse.json(
        {
          error:
            'Realtime requires OPENAI_API_KEY (OpenAI key starting with sk-).',
        },
        { status: 503 },
      )
    }

    let sdp: string | undefined
    const contentType = req.headers.get('content-type') || ''
    if (contentType.startsWith('application/json')) {
      const body = (await req.json().catch(() => ({}))) as { sdp?: string }
      sdp = body.sdp
    } else {
      sdp = await req.text()
    }
    if (!sdp?.trim()) {
      return NextResponse.json({ error: 'Missing SDP body' }, { status: 400 })
    }

    const { data: settings } = await supabase
      .from('divine_manager_settings')
      .select('notification_settings, mimic_profile')
      .eq('user_id', user.id)
      .maybeSingle()

    const voice = getDivineVoice((settings as { notification_settings?: { voice?: string } } | null)?.notification_settings?.voice)
    const mimicProfile = (settings as { mimic_profile?: Record<string, unknown> } | null)?.mimic_profile ?? {}

    const instructions = `You are Divine Mimic Interviewer, running a real-time voice interrogation to learn the creator's authentic DM style.

Start immediately with a short intro: who you are, what this interview does, and that answers are saved to improve mimic replies later.

Interview behavior:
- Ask exactly one question at a time in a natural voice.
- Keep questions short and concrete (tone, boundaries, emoji style, PPV style, taboo topics, escalation triggers).
- After each creator answer, call mimic_record_answer with the exact question and a concise answer summary.
- Ask 6-10 total questions depending on quality of answers.
- If answers are vague, ask one follow-up before moving on.
- Never ask for illegal content. Never include minors.

When enough data is collected:
- Call mimic_finalize_interview once.
- Then explain what was updated and how this will be used for DM mimic replies.
- Ask if they want another pass.

Current stored mimic profile snapshot:
${JSON.stringify(mimicProfile).slice(0, 5000)}`

    const tools = [
      {
        type: 'function' as const,
        name: 'mimic_record_answer',
        description:
          'Persist one interview QA turn to mimic_test_sessions for this creator.',
        parameters: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            answer: { type: 'string' },
          },
          required: ['question', 'answer'],
        },
      },
      {
        type: 'function' as const,
        name: 'mimic_finalize_interview',
        description:
          'Finalize interview: run AI profile refinement and persist updated mimic_profile.',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
      {
        type: 'function' as const,
        name: 'voice_allow_user_hangup',
        description:
          'Call after asking if the user wants anything else so End button can unlock in strict mode.',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
      {
        type: 'function' as const,
        name: 'end_call',
        description:
          'End the voice call only after the user confirms they are done.',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
    ]

    const sessionConfig = {
      type: 'realtime',
      model: 'gpt-realtime',
      instructions,
      audio: { output: { voice } },
      tools,
    }

    const formData = new FormData()
    formData.set('sdp', sdp)
    formData.set('session', JSON.stringify(sessionConfig))

    const res = await fetch(`${baseUrl}/v1/realtime/calls`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    })

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json(
        { error: 'Realtime session failed', details: errText.slice(0, 200) },
        { status: res.status === 401 ? 503 : res.status },
      )
    }

    const answerSdp = await res.text()
    return new NextResponse(answerSdp, {
      headers: { 'Content-Type': 'application/sdp' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Realtime session failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

