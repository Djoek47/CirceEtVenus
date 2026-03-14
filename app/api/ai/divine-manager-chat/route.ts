import { NextRequest, NextResponse } from 'next/server'
import { generateTextWithOpenAI } from '@/lib/divine-openai'
import { createClient } from '@/lib/supabase/server'

type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string }

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
    const messages = (Array.isArray(body.messages) ? body.messages : []) as ChatMessage[]
    if (!messages.length) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 })
    }

    const { data: settings } = await supabase
      .from('divine_manager_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!settings || settings.mode === 'off') {
      return NextResponse.json({
        reply:
          'Divine Manager is currently turned off. Switch it to suggest-only or semi-automatic mode in the Divine Manager page before asking for advice.',
      })
    }

    const { data: tasks } = await supabase
      .from('divine_manager_tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(40)

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
        ?.slice(0, 15)
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

    const system = `You are the Divine Manager, a Jarvis-style operations manager for this creator.
You know their tasks, rules, and analytics. Speak as a manager, not as the creator.
Never claim you have already sent messages, changed prices, or executed actions. You may only recommend or suggest actions or rule changes.
Respect the creator's boundaries, niches, and all platform safety rules.
Avoid explicit or illegal content entirely. Use clear, practical language.`

    const userContext = `Creator persona:
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

When answering, ground your advice in this context. Refer to concrete task types (dm_welcome, pricing_change, content_idea, etc.) when useful. Stay advisory-only.`

    // Use only the last ~10 messages from the conversation to keep prompts small
    const history = messages.slice(-10)

    const { text } = await generateTextWithOpenAI({
      system,
      messages: [
        { role: 'user', content: userContext },
        ...history.map((m) => ({ role: m.role, content: m.content })),
      ],
      maxTokens: 600,
      temperature: 0.6,
    })

    const reply = text.trim()

    return NextResponse.json({ reply })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Divine Manager chat failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

