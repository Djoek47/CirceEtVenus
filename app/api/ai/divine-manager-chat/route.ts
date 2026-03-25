import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runLeakScan } from '@/lib/leaks/run-scan'

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
      name: 'get_notifications',
      description:
        'Get a summary of OnlyFans notifications (new fans, tips, messages). Use when they ask what they missed, any new fans, or any new tips.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_notifications',
      description:
        'List recent OnlyFans notifications with type, user, and text. Use when they want details about what happened recently.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Max notifications (default 25)' },
          offset: { type: 'number' },
          tab: { type: 'string', description: 'Optional OnlyFans notifications tab key' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mark_notifications_read',
      description:
        'Mark all OnlyFans notifications as read. Use only when the creator explicitly asks to clear notifications on OnlyFans.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_fans',
      description:
        'List fans from OnlyFans: active, expired, latest, top spenders, or all. Use when they ask who are my fans, top fans, expired fans, or how many subscribers.',
      parameters: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            enum: ['all', 'active', 'expired', 'latest', 'top'],
            description: 'active (default), expired, latest, top, or all',
          },
          limit: { type: 'number', description: 'Max items (default 25, max 50)' },
          offset: { type: 'number' },
          sort: {
            type: 'string',
            enum: ['total', 'subscriptions', 'tips', 'messages', 'posts', 'streams'],
            description: 'For filter=top: sort by spend category',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_fan_subscription_history',
      description:
        'Get subscription history for a specific fan (renewals, expirations). Use when they ask about a fan\'s subscription history or renewals.',
      parameters: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'Fan user id (from list_fans or get_dm_conversations)' },
          limit: { type: 'number' },
          offset: { type: 'number' },
        },
        required: ['userId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_followings',
      description:
        'List who the creator follows on OnlyFans (active, expired, or all). Use when they ask about followings or who they follow.',
      parameters: {
        type: 'object',
        properties: {
          filter: { type: 'string', enum: ['all', 'active', 'expired'], description: 'Default all' },
          limit: { type: 'number' },
          offset: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_top_message',
      description:
        'Get the top-performing message (by purchases) and its buyers. Use when they ask which message did best, top message, or who bought my best message.',
      parameters: {
        type: 'object',
        properties: {
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          period: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_message_engagement',
      description:
        'Get direct or mass message engagement (list + chart). Use when they ask how did my messages perform, mass message stats, or DM performance.',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['direct', 'mass'], description: 'direct or mass messages' },
          limit: { type: 'number' },
          offset: { type: 'number' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'publish_queue_item',
      description:
        'Publish a saved post or mass message from the queue. Use when they say publish my saved post, send my saved mass DM, or publish queue item. May require confirmation.',
      parameters: {
        type: 'object',
        properties: {
          queueId: { type: 'string', description: 'Queue item id to publish' },
        },
        required: ['queueId'],
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
  {
    type: 'function',
    function: {
      name: 'run_leak_scan',
      description:
        'Run a web search for leaked content using the creator\'s connected platform usernames plus optional extra handles, then add candidate URLs to Protection / leak alerts for DMCA review. Use only when they explicitly ask to scan for leaks, find stolen content, or prepare DMCA takedowns. Uses API quota; confirm they want to run it if they were vague.',
      parameters: {
        type: 'object',
        properties: {
          aliases: {
            type: 'array',
            items: { type: 'string' },
            description: 'Extra @handles or names to search (optional)',
          },
          urls: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific infringing URLs to add to the review list (optional)',
          },
          strict: {
            type: 'boolean',
            description: 'If true (default), filter search hits to likely matches. Manual URLs are always kept.',
          },
        },
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

type DivineContext = {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
}

async function runContextTool(
  name: string,
  args: Record<string, unknown>,
  cookie: string,
  ctx?: DivineContext,
): Promise<string> {
  const base = getBaseUrl()
  const headers = { Cookie: cookie }
  try {
    if (name === 'run_leak_scan') {
      if (!ctx) return 'Leak scan is unavailable in this context.'
      const aliases = Array.isArray(args.aliases)
        ? (args.aliases as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        : []
      const urls = Array.isArray(args.urls)
        ? (args.urls as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        : []
      const strict = args.strict !== false
      const result = await runLeakScan(ctx.supabase, {
        userId: ctx.userId,
        aliases,
        urls,
        strict,
      })
      if (!result.success) {
        return `Leak scan failed: ${result.message ?? 'unknown error'}`
      }
      return [
        `Leak scan finished.`,
        `New alerts inserted: ${result.inserted}.`,
        `Skipped (already listed or not new): ${result.skipped}.`,
        `Filtered out by strict mode: ${result.filteredStrict}.`,
        result.message ? `Note: ${result.message}` : '',
        `Web search provider: ${result.providerConfigured ? 'configured' : 'not configured'}.`,
        result.grokEnrichment ? 'Grok enrichment available on Pro.' : '',
      ]
        .filter(Boolean)
        .join(' ')
    }
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
      const data = (await res.json().catch(() => ({}))) as {
        thread?: Array<{ from: string; text: string; createdAt: string }>
        error?: string
      }
      if (res.status === 404) {
        return data.error || `This fan's thread is no longer available on OnlyFans.`
      }
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
      .limit(20)

    const { data: analytics } = await supabase
      .from('analytics_snapshots')
      .select('platform,date,fans,revenue,total_fans,new_fans')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(8)

    const persona = settings.persona || {}
    const rules = settings.automation_rules || {}
    const notify = settings.notification_settings || {}

    const taskSummary =
      tasks
        ?.slice(0, 8)
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
You have access to tools: analyze content, generate captions, predict viral, get retention insights, get whale advice, get_dm_conversations, get_dm_thread, get_reply_suggestions, send_message, list_content, mass_dm, get_stats, content_publish, create_task, send_notification, list_fans, get_fan_subscription_history, list_followings, get_top_message, get_message_engagement, publish_queue_item, run_leak_scan. Use the smallest set of API calls that answers the question. For mass_dm, content_publish, and publish_queue_item the app may ask them to confirm. For run_leak_scan, only use when they want to find leaked content or prepare DMCA review; it uses search API quota.
Fans and engagement: list_fans (filter: active, expired, latest, top) for "who are my fans", "top spenders", "expired subs"; get_fan_subscription_history for a fan's renewals; list_followings for who they follow; get_top_message for best-performing message and buyers; get_message_engagement (type direct or mass) for "how did my messages perform"; publish_queue_item to publish a saved post or saved mass message. Route: "who spent the most" → list_fans filter=top; "how did my mass message do" → get_message_engagement type=mass; "publish my saved post" → publish_queue_item.
You have full access to DMs: get_dm_conversations returns fan names, usernames, and fanIds—use it to find a user by name. get_dm_thread lets you scan and read the full chat with a specific fan. get_reply_suggestions runs Scan Thread and returns Circe, Venus, and Flirt reply options for that chat. send_message sends a direct message to a specific fan (use fanId from conversations). You can read users by name, scan any thread, and send a DM to that user.

Chat behavior (match voice Divine Manager): After any tool runs—including slow or heavy ones (analyze, pricing, publish, fan lists, notifications)—write a clear summary of what came back and what the creator should do next. Do not stop after a bare tool result or a single sentence if the user still needs context. When you have addressed their request, end with a short offer to help further, e.g. "Is there anything else you want me to look at?" Do not imply the conversation is "closed" or that you are hanging up; this is text chat and stays open until they send another message.`

    const focusedFanLine = focusedFan?.id
      ? `\n\nFocused DM fan (from UI): id=${focusedFan.id}, username=${focusedFan.username ?? 'unknown'}, name=${focusedFan.name ?? 'unknown'}.\nIf a focused fan is provided, assume all DM questions refer to this fan unless the creator names someone else. Do not run a broad search first. When using DM tools (get_dm_thread, get_reply_suggestions, send_message), use this fan's id directly unless the creator clearly asks for someone else.`
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

    const history = messages.slice(-6)
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
        max_tokens: 450,
        temperature: 0.55,
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
      const isContextTool = [
        'get_dm_conversations',
        'get_dm_thread',
        'get_reply_suggestions',
        'list_content',
        'run_leak_scan',
      ].includes(name)
      if (isAITool) {
        const out = await runAITool(name, args, cookie)
        const summary = out.success
          ? (typeof out.result === 'object' && out.result !== null && 'content' in out.result
              ? String((out.result as { content: string }).content).slice(0, 500)
              : JSON.stringify(out.result).slice(0, 500))
          : (out.error ?? 'Tool failed')
        toolResults.push({ role: 'tool', tool_call_id: tc.id, content: summary })
      } else if (isContextTool) {
        const summary = await runContextTool(name, args, cookie, { supabase, userId: user.id })
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
        if (name === 'get_notifications') {
          const intentRes = await runIntent('get_notifications_summary', intentBody, cookie)
          const summary = (intentRes.summary ?? intentRes.message ?? JSON.stringify(intentRes)).slice(0, 4000)
          toolResults.push({ role: 'tool', tool_call_id: tc.id, content: summary })
          continue
        }
        if (name === 'list_notifications') {
          const intentRes = await runIntent('list_notifications', intentBody, cookie)
          let summary = intentRes.summary ?? intentRes.message ?? JSON.stringify(intentRes)
          const r = intentRes as { notifications?: unknown[] }
          if (Array.isArray(r.notifications) && r.notifications.length) {
            summary += '\n' + JSON.stringify(r.notifications.slice(0, 25)).slice(0, 3000)
          }
          toolResults.push({ role: 'tool', tool_call_id: tc.id, content: summary.slice(0, 6000) })
          continue
        }
        if (name === 'mark_notifications_read') {
          const intentRes = await runIntent('mark_notifications_read', intentBody, cookie)
          const summary = (intentRes.summary ?? intentRes.message ?? JSON.stringify(intentRes)).slice(0, 2000)
          toolResults.push({ role: 'tool', tool_call_id: tc.id, content: summary })
          continue
        }
        const intentRes = await runIntent(name, intentBody, cookie)
        let summary = intentRes.summary ?? intentRes.message ?? JSON.stringify(intentRes)
        const dataIntent = name as string
        if (
          dataIntent === 'list_fans' &&
          Array.isArray((intentRes as { fans?: unknown[] }).fans)
        ) {
          const fans = (intentRes as { fans: unknown[] }).fans
          summary += '\n' + JSON.stringify(fans.slice(0, 30)).slice(0, 3000)
        } else if (
          dataIntent === 'get_fan_subscription_history' &&
          Array.isArray((intentRes as { history?: unknown[] }).history)
        ) {
          summary += '\n' + JSON.stringify((intentRes as { history: unknown[] }).history).slice(0, 2000)
        } else if (
          dataIntent === 'list_followings' &&
          Array.isArray((intentRes as { followings?: unknown[] }).followings)
        ) {
          summary += '\n' + JSON.stringify((intentRes as { followings: unknown[] }).followings.slice(0, 20)).slice(0, 2000)
        } else if (dataIntent === 'get_top_message') {
          const r = intentRes as { message?: unknown; buyers?: unknown[] }
          if (r.message) summary += '\nMessage: ' + JSON.stringify(r.message).slice(0, 1000)
          if (Array.isArray(r.buyers) && r.buyers.length)
            summary += '\nBuyers: ' + JSON.stringify(r.buyers.slice(0, 15)).slice(0, 1500)
        } else if (
          dataIntent === 'get_message_engagement' &&
          ((intentRes as { messages?: unknown[] }).messages != null ||
            (intentRes as { chart?: unknown[] }).chart != null)
        ) {
          const r = intentRes as { messages?: unknown[]; chart?: unknown[] }
          if (Array.isArray(r.messages) && r.messages.length)
            summary += '\nMessages: ' + JSON.stringify(r.messages.slice(0, 10)).slice(0, 2000)
          if (Array.isArray(r.chart) && r.chart.length)
            summary += '\nChart: ' + JSON.stringify(r.chart.slice(-14)).slice(0, 1500)
        }
        toolResults.push({ role: 'tool', tool_call_id: tc.id, content: summary.slice(0, 6000) })
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
        // Higher than the no-tools reply so post-tool summaries are not cut off mid-thought.
        max_tokens: 520,
        temperature: 0.55,
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
