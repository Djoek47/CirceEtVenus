import { NextRequest, NextResponse } from 'next/server'
import { generateTextWithOpenAI } from '@/lib/divine-openai'
import { createClient } from '@/lib/supabase/server'

type VoiceMode = 'intro' | 'ongoing' | 'what_next'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const mode: VoiceMode = ['intro', 'ongoing', 'what_next'].includes(body.mode)
      ? body.mode
      : 'intro'

    const { data: settings } = await supabase
      .from('divine_manager_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!settings || settings.mode === 'off') {
      return NextResponse.json({
        script:
          'Divine Manager is currently turned off. Switch it to suggest-only or semi-automatic mode to receive guidance.',
      })
    }

    const { data: tasks } = await supabase
      .from('divine_manager_tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)

    const { data: analytics } = await supabase
      .from('analytics_snapshots')
      .select('platform,date,fans,revenue')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(7)

    const persona = settings.persona || {}
    const rules = settings.automation_rules || {}
    const notify = settings.notification_settings || {}

    const taskSummary =
      tasks
        ?.slice(0, 10)
        .map(
          (t) =>
            `[${t.status}] ${t.type}${
              t.category ? ` (${t.category})` : ''
            }: ${String(t.payload?.summary || '').slice(0, 80)}`
        )
        .join('\n') || 'No tasks yet.'

    const analyticsSummary =
      analytics && analytics.length
        ? analytics
            .map((row) => `${row.date} ${row.platform}: fans=${row.fans ?? 'n/a'}, revenue=${row.revenue ?? 'n/a'}`)
            .join('\n')
        : 'No recent analytics snapshots.'

    const modeLine =
      mode === 'intro'
        ? 'Give a concise 30 to 60 second style briefing with: key wins, current risks, and the top three things the creator should do today.'
        : mode === 'ongoing'
          ? 'Give one or two brief sentences about any new or changed priorities since last time. If nothing has changed, say that clearly.'
          : 'Give a ranked list of two or three concrete next actions the creator should take right now.'

    const system = `You are the Divine Manager, a Jarvis-style voice companion for a creator.
Speak as a calm, confident manager. Never role-play as the creator, and never claim to have already sent messages or changed prices.
You only describe what you see and what you recommend. Respect boundaries, niches, and platform safety rules.
Avoid explicit or illegal content entirely.`

    const userPrompt = `Creator persona:
- Tone: ${persona.tone ?? 'friendly'}
- Flirty level: ${persona.flirtyLevel ?? 'mild'}
- Boundaries: ${(persona.boundaries ?? []).join('; ') || 'none specified'}

Manager settings:
- Archetype: ${settings.manager_archetype || 'hermes'}
- Mode: ${settings.mode}
- Notifications: ${notify.level ?? 'daily_digest'}
- Automation: posts=${rules.autoPostSchedule?.enabled ? 'on' : 'off'}, welcomeDM=${rules.autoWelcomeDm?.enabled ? 'on' : 'off'}, tipFollowup=${rules.autoFollowUpAfterTips?.enabled ? 'on' : 'off'}

Recent tasks:
${taskSummary}

Recent analytics (most recent first):
${analyticsSummary}

Now, in your spoken response:
${modeLine}

Speak directly to the creator, but in second person (\"you\"). Keep it actionable but advisory, not absolute. Do not read raw JSON or bullet syntax; speak like a human manager.`

    const { text } = await generateTextWithOpenAI({
      system,
      prompt: userPrompt,
      maxTokens: 400,
      temperature: 0.6,
    })

    const script = text.trim()
    if (!script) return NextResponse.json({ script: '', error: 'Empty script' }, { status: 500 })

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return NextResponse.json({ script, error: 'TTS not configured' }, { status: 200 })

    const ttsInput = script.slice(0, 4096)
    const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        voice: 'shimmer',
        input: ttsInput,
      }),
    })
    if (!ttsRes.ok) {
      const errText = await ttsRes.text()
      console.error('[divine-manager-voice] TTS error:', ttsRes.status, errText)
      return NextResponse.json({ script, error: 'TTS failed' }, { status: 200 })
    }
    const audioBuffer = await ttsRes.arrayBuffer()
    const audioBase64 = Buffer.from(audioBuffer).toString('base64')
    return NextResponse.json({ script, audio: audioBase64 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Divine Manager voice failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

