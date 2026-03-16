import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string }

export const maxDuration = 60

const OPENAI_MODEL = 'gpt-4o-mini'

/** Curated tools for Divine chat: AI tools (run-ai-tool) and intents (intent API). */
const CHAT_TOOLS: Array<{
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, { type: string; description?: string; enum?: string[] }>
      required?: string[]
    }
  }
}> = [
  {
    type: 'function',
    function: {
      name: 'analyze_content',
      description: 'Rate content for commercial appeal (score 1-10). Use when they ask to rate or analyze content. Text description only in chat (no image).',
      parameters: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'Description of the content' },
          niche: { type: 'string', description: 'Optional niche' },
          platform: { type: 'string', enum: ['onlyfans', 'fansly'], description: 'Platform' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_caption',
      description: 'Generate captions and hashtags for content. Use when they ask for a caption or what to say for a post.',
      parameters: {
        type: 'object',
        properties: {
          contentType: { type: 'string', description: 'e.g. photo, video' },
          contentDescription: { type: 'string', description: 'What the content is about' },
          platform: { type: 'string', enum: ['onlyfans', 'fansly'] },
        },
        required: ['contentDescription'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'predict_viral',
      description: 'Predict viral potential and engagement tips. Use when they ask how content will perform.',
      parameters: {
        type: 'object',
        properties: {
          contentDescription: { type: 'string' },
          contentType: { type: 'string' },
          platform: { type: 'string', enum: ['onlyfans', 'fansly'] },
        },
        required: ['contentDescription'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_retention_insights',
      description: 'Get churn risk and retention advice. Use when they ask about keeping fans, at-risk subs, or retention.',
      parameters: {
        type: 'object',
        properties: {
          fanData: { type: 'string' },
          recentActivity: { type: 'string' },
          subscriptionLength: { type: 'string' },
          spendingHistory: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_whale_advice',
      description: 'Get advice for engaging high-value (whale) fans. Use when they ask about top spenders or VIPs.',
      parameters: {
        type: 'object',
        properties: { context: { type: 'string', description: 'Optional context' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mass_dm',
      description: 'Send a mass message to subscribers. Use when they ask to message fans or send a DM. May require confirmation.',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          platforms: { type: 'array', items: { type: 'string', enum: ['onlyfans', 'fansly'] } },
          segment: { type: 'string' },
          filter: { type: 'string', enum: ['all', 'active', 'expired', 'renewing'] },
        },
        required: ['message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_stats',
      description: 'Get analytics summary: revenue, fans, platform breakdown.',
      parameters: {
        type: 'object',
        properties: {
          period: { type: 'string' },
          platform: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'content_publish',
      description: 'Publish or schedule a post. Use when they ask to post content. May require confirmation.',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string' },
          platforms: { type: 'array', items: { type: 'string', enum: ['onlyfans', 'fansly'] } },
          scheduledFor: { type: 'string' },
        },
        required: ['content', 'platforms'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Create a Divine Manager task (reminder/suggestion).',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          summary: { type: 'string' },
        },
        required: ['summary'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'adjust_price',
      description: 'Suggest a pricing change. Actual changes are applied by the creator in platform settings.',
      parameters: {
        type: 'object',
        properties: {
          platform: { type: 'string' },
          tier: { type: 'string' },
          new_price: { type: 'number' },
          delta: { type: 'number', description: 'Price change amount' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_notification',
      description: 'Create an in-app notification/reminder for the creator.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          link: { type: 'string' },
        },
        required: ['title', 'description'],
      },
    },
  },
]

const AI_TOOL_NAME_TO_ID: Record<string, string> = {
  analyze_content: 'standard-of-attraction',
  generate_caption: 'caption-generator',
  predict_viral: 'viral-predictor',
  get_retention_insights: 'churn-predictor',
  get_whale_advice: 'whale-whisperer',
}

function getBaseUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

async function runAITool(
  toolName: string,
  args: Record<string, unknown>,
  cookie: string
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  const toolId = AI_TOOL_NAME_TO_ID[toolName]
  if (!toolId) return { success: false, error: 'Unknown AI tool' }
  const base = getBaseUrl()
  const res = await fetch(`${base}/api/divine/run-ai-tool`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ toolId, params: args }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { success: false, error: (data as { error?: string }).error || 'Tool failed' }
  return { success: true, result: (data as { result?: unknown }).result }
}

async function runIntent(
  type: string,
  args: Record<string, unknown>,
  cookie: string
): Promise<{ status: string; intent_id?: string; summary?: string; message?: string; success?: boolean }> {
  const base = getBaseUrl()
  const body: Record<string, unknown> = { type, ...args }
  if (type === 'create_task' && args.summary) {
    body.payload = { type: (args as { type?: string }).type ?? 'content_idea', summary: args.summary }
    body.summary = args.summary
  }
  const res = await fetch(`${base}/api/divine/intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  return data as { status: string; intent_id?: string; summary?: string; message?: string; success?: boolean }
}

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
Avoid explicit or illegal content entirely. Use clear, practical language.
You have access to tools: analyze content, generate captions, predict viral, get retention insights, get whale advice, mass_dm, get_stats, content_publish, create_task, send_notification. Use them when the creator's request fits; then summarize the result. For mass_dm and content_publish the app may ask them to confirm—tell them to confirm in the app or say yes if so.`

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

Connected platforms: OnlyFans, Fansly. Refer to them by name when giving advice.`

    const history = messages.slice(-10)
    const cookie = req.headers.get('cookie') || ''
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY is not set' }, { status: 503 })
    }

    const openAiMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string | null; tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }> } | { role: 'tool'; tool_call_id: string; content: string }> = [
      { role: 'system', content: system },
      { role: 'user', content: userContext },
      ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ]

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: openAiMessages,
        tools: CHAT_TOOLS,
        max_tokens: 800,
        temperature: 0.6,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json({ error: `OpenAI error: ${errText.slice(0, 200)}` }, { status: 502 })
    }

    const data = (await res.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null
          tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>
        }
      }>
    }
    const firstChoice = data.choices?.[0]?.message
    if (!firstChoice) {
      return NextResponse.json({ error: 'No response from model' }, { status: 502 })
    }

    const toolCalls = firstChoice.tool_calls
    if (!toolCalls?.length) {
      const reply = (firstChoice.content ?? '').trim()
      return NextResponse.json({ reply })
    }

    const pendingConfirmations: Array<{ type: string; intent_id: string; summary?: string }> = []
    const toolResults: Array<{ role: 'tool'; tool_call_id: string; content: string }> = []

    for (const tc of toolCalls) {
      const name = tc.function.name
      let args: Record<string, unknown> = {}
      try {
        args = JSON.parse(tc.function.arguments || '{}') as Record<string, unknown>
      } catch {
        args = {}
      }

      const isAITool = name in AI_TOOL_NAME_TO_ID
      if (isAITool) {
        const out = await runAITool(name, args, cookie)
        const summary = out.success
          ? (typeof out.result === 'object' && out.result !== null && 'content' in out.result
              ? String((out.result as { content: string }).content).slice(0, 500)
              : JSON.stringify(out.result).slice(0, 500))
          : (out.error ?? 'Tool failed')
        toolResults.push({ role: 'tool', tool_call_id: tc.id, content: summary })
      } else {
        let intentBody: Record<string, unknown> = { ...args }
        if (name === 'content_publish' && args.platforms) {
          intentBody.platforms = Array.isArray(args.platforms) ? args.platforms : [args.platforms]
        }
        if (name === 'mass_dm' && args.platforms) {
          intentBody.platforms = Array.isArray(args.platforms) ? args.platforms : [args.platforms]
        }
        if (name === 'create_task') {
          intentBody = {
            summary: args.summary ?? 'Task',
            payload: { type: (args as { type?: string }).type ?? 'content_idea', summary: args.summary },
          }
        }
        const intentRes = await runIntent(name, intentBody, cookie)
        const summary = intentRes.summary ?? intentRes.message ?? JSON.stringify(intentRes)
        toolResults.push({ role: 'tool', tool_call_id: tc.id, content: summary })
        if (intentRes.status === 'requires_confirmation' && intentRes.intent_id) {
          pendingConfirmations.push({
            type: name,
            intent_id: intentRes.intent_id,
            summary: intentRes.summary,
          })
        }
      }
    }

    const followUpMessages: typeof openAiMessages = [
      ...openAiMessages,
      {
        role: 'assistant' as const,
        content: null,
        tool_calls: toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.function.name, arguments: tc.function.arguments },
        })),
      },
      ...toolResults,
    ]

    const res2 = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: followUpMessages,
        max_tokens: 600,
        temperature: 0.6,
      }),
    })

    if (!res2.ok) {
      const errText = await res2.text()
      return NextResponse.json({ error: `OpenAI follow-up error: ${errText.slice(0, 200)}` }, { status: 502 })
    }

    const data2 = (await res2.json()) as { choices?: Array<{ message?: { content?: string | null } }> }
    const finalContent = data2.choices?.[0]?.message?.content ?? ''
    const reply = finalContent.trim()

    const response: { reply: string; actions?: Array<{ type: string; intent_id: string; summary?: string }> } = {
      reply: reply || 'Done. If you asked to send a message or publish content, check the app to confirm.',
    }
    if (pendingConfirmations.length) {
      response.actions = pendingConfirmations
    }
    return NextResponse.json(response)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Divine Manager chat failed'
    console.error('[divine-manager-chat]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
