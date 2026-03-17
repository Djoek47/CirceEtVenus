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
      name: 'get_dm_conversations',
      description:
        'List recent DM conversations with fan names, usernames, and fanIds (OnlyFans). Use when the creator asks who messaged, recent chats, or to find a fan by name so you can scan their thread or send a DM. Prefer this to search for a fan instead of scanning individual message threads.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Max conversations (default 20)' },
          query: {
            type: 'string',
            description:
              'Optional name or username substring to filter conversations (case-insensitive).',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_dm_thread',
      description: 'Scan and read the full message thread with a specific fan. Use fanId from get_dm_conversations. Use when they want to see the chat history or before suggesting a reply.',
      parameters: {
        type: 'object',
        properties: { fanId: { type: 'string', description: 'Fan ID from get_dm_conversations' } },
        required: ['fanId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_reply_suggestions',
      description: 'Scan the thread and get Circe, Venus, and Flirt reply suggestions for a fan. Returns Scan insights, recommendation (Circe/Venus/Flirt), and three reply options. Use with fanId from get_dm_conversations after reading the thread if needed.',
      parameters: {
        type: 'object',
        properties: { fanId: { type: 'string', description: 'Fan ID from get_dm_conversations' } },
        required: ['fanId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_message',
      description: 'Send a direct message to a specific fan. Use fanId from get_dm_conversations (or from get_dm_thread/get_reply_suggestions). You can send to a user by name by first calling get_dm_conversations to find their fanId.',
      parameters: {
        type: 'object',
        properties: {
          fanId: { type: 'string', description: 'Fan ID from conversations list' },
          message: { type: 'string', description: 'Message text to send' },
          platform: { type: 'string', enum: ['onlyfans', 'fansly'] },
          price: { type: 'number' },
          mediaIds: { type: 'array', items: { type: 'string' } },
        },
        required: ['fanId', 'message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_content',
      description: 'List the creator\'s content (schedule, drafts, published).',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number' },
          status: { type: 'string', enum: ['draft', 'scheduled', 'published'] },
        },
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

async function runContextTool(
  name: string,
  args: Record<string, unknown>,
  cookie: string
): Promise<string> {
  const base = getBaseUrl()
  const headers = { Cookie: cookie }
  try {
    if (name === 'get_dm_conversations') {
      const limit = typeof args.limit === 'number' ? args.limit : 20
      const query =
        typeof args.query === 'string' && args.query.trim().length
          ? `&query=${encodeURIComponent(args.query.trim())}`
          : ''
      const res = await fetch(
        `${base}/api/divine/dm-conversations?limit=${limit}${query}`,
        { headers },
      )
      const data = (await res.json().catch(() => ({}))) as { conversations?: Array<{ fanId: string; username: string; name?: string | null; lastMessage?: string; unreadCount?: number }>; error?: string }
      if (data.error || !res.ok) return data.error ?? 'Failed to fetch conversations.'
      const list = (data.conversations ?? []).slice(0, 15).map((c) => {
        const label = c.name ? `${c.name} (@${c.username})` : `@${c.username}`
        return `${label} [id: ${c.fanId}]${c.unreadCount ? ` [${c.unreadCount} unread]` : ''}: ${(c.lastMessage ?? '').slice(0, 60)}`
      })
      return list.length ? `Recent conversations (name, username, fanId, last message):\n${list.join('\n')}` : 'No recent conversations.'
    }
    if (name === 'get_dm_thread') {
      const fanId = args.fanId
      if (!fanId) return 'fanId is required.'
      const res = await fetch(`${base}/api/divine/dm-thread`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ fanId }),
      })
      const data = (await res.json().catch(() => ({}))) as { thread?: Array<{ from: string; text: string; createdAt: string }>; error?: string }
      if (data.error || !res.ok) return data.error ?? 'Failed to fetch thread.'
      const thread = (data.thread ?? []).slice(-25).map((m) => `${m.from}: ${m.text.slice(0, 200)}`)
      return thread.length ? `Thread:\n${thread.join('\n')}` : 'No messages in thread.'
    }
    if (name === 'get_reply_suggestions') {
      const fanId = args.fanId
      if (!fanId) return 'fanId is required.'
      const res = await fetch(`${base}/api/divine/dm-reply-suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ fanId }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        scan?: { insights?: string[]; riskFlags?: string[] };
        circeSuggestions?: string[];
        venusSuggestions?: string[];
        flirtSuggestions?: string[];
        recommendation?: string;
        recommendationReason?: string;
        fan?: { username?: string };
        error?: string;
      }
      if (data.error || !res.ok) return data.error ?? 'Failed to get reply suggestions.'
      const rec = data.recommendation ? `Recommendation: ${data.recommendation.toUpperCase()}. ${data.recommendationReason ?? ''}` : ''
      const circe = (data.circeSuggestions ?? [])[0] ? `Circe: ${(data.circeSuggestions![0]).slice(0, 150)}...` : ''
      const venus = (data.venusSuggestions ?? [])[0] ? `Venus: ${(data.venusSuggestions![0]).slice(0, 150)}...` : ''
      const flirt = (data.flirtSuggestions ?? [])[0] ? `Flirt: ${(data.flirtSuggestions![0]).slice(0, 150)}...` : ''
      const scanLine = data.scan?.insights?.length ? `Scan: ${data.scan.insights.slice(0, 2).join('; ')}` : ''
      return [scanLine, rec, circe, venus, flirt].filter(Boolean).join('\n') || 'No suggestions generated.'
    }
    if (name === 'list_content') {
      const limit = typeof args.limit === 'number' ? args.limit : 20
      const status = typeof args.status === 'string' ? args.status : ''
      const q = new URLSearchParams({ limit: String(limit) })
      if (status) q.set('status', status)
      const res = await fetch(`${base}/api/divine/content-list?${q}`, { headers })
      const data = (await res.json().catch(() => ({}))) as { content?: Array<{ id: string; title: string; status: string; scheduled_at?: string }>; error?: string }
      if (data.error || !res.ok) return data.error ?? 'Failed to fetch content.'
      const list = (data.content ?? []).map((c) => `[${c.status}] ${c.title}${c.scheduled_at ? ` (${c.scheduled_at})` : ''}`)
      return list.length ? `Content:\n${list.join('\n')}` : 'No content found.'
    }
  } catch (e) {
    return (e instanceof Error ? e.message : 'Request failed')
  }
  return 'Unknown context tool.'
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
    const focusedFan = body.focusedFan as { id?: string; username?: string; name?: string } | undefined
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
      .select('platform,date,fans,revenue,total_fans,new_fans')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(14)

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
            .map(
              (row) =>
                `${row.date} ${row.platform}: fans=${row.fans ?? 'n/a'}, revenue=${row.revenue ?? 'n/a'}${row.total_fans != null ? `, total_fans=${row.total_fans}` : ''}${row.new_fans != null ? `, new_fans=${row.new_fans}` : ''}`
            )
            .join('\n')
        : 'No recent analytics snapshots.'

    const system = `You are the Divine Manager, a Jarvis-style operations manager for this creator.
You know their tasks, rules, and analytics. Speak as a manager, not as the creator.
Never claim you have already sent messages, changed prices, or executed actions. You may only recommend or suggest actions or rule changes.
Respect the creator's boundaries, niches, and all platform safety rules.
Avoid explicit or illegal content entirely. Use clear, practical language.
You have access to tools: analyze content, generate captions, predict viral, get retention insights, get whale advice, get_dm_conversations, get_dm_thread, get_reply_suggestions, send_message, list_content, mass_dm, get_stats, content_publish, create_task, send_notification. Use them when the creator's request fits; then summarize the result. For mass_dm and content_publish the app may ask them to confirm.
You have full access to DMs: get_dm_conversations returns fan names, usernames, and fanIds—use it to find a user by name. get_dm_thread lets you scan and read the full chat with a specific fan. get_reply_suggestions runs Scan Thread and returns Circe, Venus, and Flirt reply options for that chat. send_message sends a direct message to a specific fan (use fanId from conversations). You can read users by name, scan any thread, and send a DM to that user.`

    const focusedFanLine = focusedFan?.id
      ? `\n\nFocused DM fan (from UI): id=${focusedFan.id}, username=${focusedFan.username ?? 'unknown'}, name=${focusedFan.name ?? 'unknown'}.\nWhen using DM tools (get_dm_thread, get_reply_suggestions, send_message), prefer this fan unless the creator clearly asks for someone else.`
      : ''

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

Recent analytics (14 days, most recent first):
${analyticsSummary}

You have access to the creator's analytics: fans, revenue, and platform breakdown; use this when they ask about performance, sales, or growth.

Connected platforms: OnlyFans, Fansly. Refer to them by name when giving advice.${focusedFanLine}`

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
      const isContextTool = ['get_dm_conversations', 'get_dm_thread', 'get_reply_suggestions', 'list_content'].includes(name)
      if (isAITool) {
        const out = await runAITool(name, args, cookie)
        const summary = out.success
          ? (typeof out.result === 'object' && out.result !== null && 'content' in out.result
              ? String((out.result as { content: string }).content).slice(0, 500)
              : JSON.stringify(out.result).slice(0, 500))
          : (out.error ?? 'Tool failed')
        toolResults.push({ role: 'tool', tool_call_id: tc.id, content: summary })
      } else if (isContextTool) {
        const summary = await runContextTool(name, args, cookie)
        toolResults.push({ role: 'tool', tool_call_id: tc.id, content: summary.slice(0, 1000) })
      } else {
        let intentBody: Record<string, unknown> = { ...args }
        if (name === 'content_publish' && args.platforms) {
          intentBody.platforms = Array.isArray(args.platforms) ? args.platforms : [args.platforms]
        }
        if (name === 'mass_dm' && args.platforms) {
          intentBody.platforms = Array.isArray(args.platforms) ? args.platforms : [args.platforms]
        }
        if (name === 'send_message') {
          intentBody.fanId = args.fanId
          intentBody.message = args.message
          intentBody.platform = args.platform ?? 'onlyfans'
          intentBody.price = args.price
          intentBody.mediaIds = args.mediaIds
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
