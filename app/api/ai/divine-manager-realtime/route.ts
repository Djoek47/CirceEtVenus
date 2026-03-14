import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getArchetypeFlavor } from '@/lib/divine-manager-archetypes'

export const maxDuration = 30

/**
 * POST: create a full-duplex Realtime (WebRTC) session with Divine Manager context.
 * Body: raw SDP string (Content-Type: application/sdp or text/plain).
 * Returns: SDP answer string for the client to setRemoteDescription.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Realtime API requires an OpenAI API key (sk-...). Do NOT use Vercel AI Gateway key (vck_...) here —
    // the gateway does not support Realtime; OpenAI will reject non-OpenAI keys.
    const baseUrl =
      process.env.OPENAI_BASE_URL?.replace(/\/$/, '') || 'https://api.openai.com'
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey || !apiKey.startsWith('sk-')) {
      return NextResponse.json(
        {
          error:
            'Realtime requires OPENAI_API_KEY (OpenAI key starting with sk-). Do not use the Vercel AI Gateway key here.',
        },
        { status: 503 }
      )
    }

    const sdp = await req.text()
    if (!sdp?.trim()) {
      return NextResponse.json({ error: 'Missing SDP body' }, { status: 400 })
    }

    const { data: settings } = await supabase
      .from('divine_manager_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    const { data: tasks } = await supabase
      .from('divine_manager_tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    const { data: analytics } = await supabase
      .from('analytics_snapshots')
      .select('platform,date,fans,revenue')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(7)

    const persona = settings?.persona ?? {}
    const goals = settings?.goals ?? {}
    const rules = settings?.automation_rules ?? {}
    const notify = settings?.notification_settings ?? {}
    const archetype = settings?.manager_archetype || 'hermes'
    const archetypeFlavor = getArchetypeFlavor(archetype)

    const taskSummary =
      tasks
        ?.slice(0, 10)
        .map(
          (t) =>
            `[${t.status}] ${t.type}${t.category ? ` (${t.category})` : ''}: ${String(t.payload?.summary ?? '').slice(0, 80)}`
        )
        .join('\n') || 'No tasks yet.'

    const analyticsSummary =
      analytics && analytics.length
        ? analytics
            .map(
              (row) =>
                `${row.date} ${row.platform}: fans=${row.fans ?? 'n/a'}, revenue=${row.revenue ?? 'n/a'}`
            )
            .join('\n')
        : 'No recent analytics.'

    const instructions = `You are the Divine Manager, a Jarvis-style voice companion for a creator. You speak in real time over voice. Be a calm, confident manager. Never role-play as the creator; never claim to have already sent messages or changed prices. You only describe what you see and what you recommend. Respect boundaries and platform safety. Avoid explicit or illegal content.

Creator persona: tone ${persona.tone ?? 'friendly'}, flirty level ${persona.flirtyLevel ?? 'mild'}. Boundaries: ${(persona.boundaries ?? []).join('; ') || 'none specified'}.
Goals: ${(goals.qualitativeGoals ?? []).join(', ') || 'general growth'}.
Manager archetype: ${archetype}. ${archetypeFlavor}
Mode: ${settings?.mode ?? 'suggest_only'}. Notifications: ${notify.level ?? 'daily_digest'}.
Automation: posts=${rules.autoPostSchedule?.enabled ? 'on' : 'off'}, welcome DM=${rules.autoWelcomeDm?.enabled ? 'on' : 'off'}, tip follow-up=${rules.autoFollowUpAfterTips?.enabled ? 'on' : 'off'}.

Recent tasks:
${taskSummary}

Recent analytics:
${analyticsSummary}

Speak in second person ("you"). Keep replies actionable but advisory. Be concise; this is a live conversation.`

    const sessionConfig = {
      type: 'realtime',
      model: 'gpt-realtime',
      instructions,
      audio: { output: { voice: 'shimmer' as const } },
    }

    const formData = new FormData()
    formData.set('sdp', sdp)
    formData.set('session', JSON.stringify(sessionConfig))

    const realtimeUrl = `${baseUrl}/v1/realtime/calls`
    const res = await fetch(realtimeUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[divine-manager-realtime] OpenAI error:', res.status, errText)
      return NextResponse.json(
        { error: 'Realtime session failed', details: errText.slice(0, 200) },
        { status: res.status === 401 ? 503 : res.status }
      )
    }

    const answerSdp = await res.text()
    return new NextResponse(answerSdp, {
      headers: { 'Content-Type': 'application/sdp' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Realtime session failed'
    console.error('[divine-manager-realtime]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
