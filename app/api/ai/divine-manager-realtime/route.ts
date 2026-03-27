import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getArchetypeFlavor } from '@/lib/divine-manager-archetypes'
import { getDivineVoice } from '@/lib/divine-manager'
import type { DivineVoiceMemoryPayload } from '@/lib/divine/voice-memory-types'

export const maxDuration = 30

type FocusedFan = { id?: string; username?: string | null; name?: string | null }

/**
 * POST: create a full-duplex Realtime (WebRTC) session with Divine Manager context.
 *
 * Body (preferred): JSON { sdp: string, focusedFan?: { id, username?, name? } }
 * Also supports legacy: raw SDP string (Content-Type: application/sdp or text/plain).
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
        { status: 503 },
      )
    }

    let focusedFan: FocusedFan | undefined
    let sdp: string | undefined
    const contentType = req.headers.get('content-type') || ''
    if (contentType.startsWith('application/json')) {
      const body = (await req.json().catch(() => ({}))) as {
        sdp?: string
        focusedFan?: FocusedFan
      }
      sdp = body.sdp
      focusedFan = body.focusedFan
    } else {
      sdp = await req.text()
    }

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
      .select('platform,date,fans,revenue,total_fans,new_fans')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(14)

    const { data: profileRow, error: voiceMemErr } = await supabase
      .from('profiles')
      .select('divine_voice_memory')
      .eq('id', user.id)
      .maybeSingle()

    if (voiceMemErr) {
      console.warn('[divine-manager-realtime] divine_voice_memory:', voiceMemErr.message)
    }
    const voiceMem = (voiceMemErr ? {} : (profileRow?.divine_voice_memory ?? {})) as DivineVoiceMemoryPayload
    const voiceMemoryLine =
      voiceMem.status === 'in_progress' &&
      (voiceMem.resume_hint || (voiceMem.action_log && voiceMem.action_log.length > 0))
        ? `\n\nPrevious voice session may be incomplete: ${voiceMem.resume_hint || 'Last flow was interrupted.'} Recent tools: ${(voiceMem.action_log ?? [])
            .slice(-5)
            .map((a) => a.tool)
            .join(', ') || 'none'}. Offer briefly to continue that work or start fresh; if they decline, move on.`
        : ''

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
                `${row.date} ${row.platform}: fans=${row.fans ?? 'n/a'}, revenue=${row.revenue ?? 'n/a'}${row.total_fans != null ? `, total_fans=${row.total_fans}` : ''}${row.new_fans != null ? `, new_fans=${row.new_fans}` : ''}`
            )
            .join('\n')
        : 'No recent analytics.'
    const analyticsTotals =
      analytics && analytics.length
        ? (() => {
            const rev = analytics.reduce((s, r) => s + (Number(r.revenue) || 0), 0)
            const fansMax = Math.max(0, ...analytics.map((r) => Number(r.fans) || 0))
            return `Total revenue (period): ${rev.toFixed(2)}. Peak fans in period: ${fansMax}.`
          })()
        : ''

    const focusedFanLine = focusedFan?.id
      ? `\n\nFocused DM fan (from UI): id=${focusedFan.id}, username=${focusedFan.username ?? 'unknown'}, name=${focusedFan.name ?? 'unknown'}.\nIf a focused fan is provided, assume all DM questions refer to this fan unless the creator names someone else. Do not run a broad search first. When using DM tools (get_dm_thread, get_reply_suggestions, send_message), use this fan's id directly unless the creator clearly asks for someone else. Prefer this fan over running get_dm_conversations when they are already in this chat.`
      : '\n\nNo focused fan in the UI: if they ask to read a specific thread, use get_dm_conversations to find fanId or ask them to open Messages and pick a fan first.'

    const instructions = `You are the Divine Manager, a Jarvis-style voice companion for a creator. You speak in real time over voice. Be a calm, confident manager. Never role-play as the creator; never claim to have already sent messages or changed prices. You only describe what you see and what you recommend. Respect boundaries and platform safety. Avoid explicit or illegal content.

Creator persona: tone ${persona.tone ?? 'friendly'}, flirty level ${persona.flirtyLevel ?? 'mild'}. Boundaries: ${(persona.boundaries ?? []).join('; ') || 'none specified'}.
Goals: ${(goals.qualitativeGoals ?? []).join(', ') || 'general growth'}.
Manager archetype: ${archetype}. ${archetypeFlavor}
Mode: ${settings?.mode ?? 'suggest_only'}. Notifications: ${notify.level ?? 'daily_digest'}.
Automation: posts=${rules.autoPostSchedule?.enabled ? 'on' : 'off'}, welcome DM=${rules.autoWelcomeDm?.enabled ? 'on' : 'off'}, tip follow-up=${rules.autoFollowUpAfterTips?.enabled ? 'on' : 'off'}.

Recent tasks:
${taskSummary}

Recent analytics (14 days):
${analyticsSummary}
${analyticsTotals ? `\n${analyticsTotals}` : ''}

You have access to the creator's analytics: fans, revenue, and platform breakdown; use this when they ask about performance, sales, or growth.

    You can see and act on OnlyFans fans, followings, message engagement, and queue: list_fans (filter: active, expired, latest, top) for who are my fans, top spenders, or expired subs; get_fan_subscription_history for a specific fan's renewals; list_followings for who the creator follows; get_top_message for the best-performing message and its buyers; get_message_engagement (type direct or mass) for how DMs or mass messages performed; publish_queue_item to publish a saved post or saved mass message. Prefer the smallest set of API calls that answers the question: e.g. "who spent the most this month" → list_fans with filter=top; "how did yesterday's mass message do" → get_message_engagement with type=mass; "publish my saved post about the new set" → look up queue then publish_queue_item with that queueId.

You have full access to DMs and content: get_dm_conversations returns fan names, usernames, and fanIds—use it to find a user by name. get_dm_thread lets you scan and read the full chat with a specific fan. If a DM thread is not found (for example, the fan or conversation was deleted), tell the creator that the thread is no longer available and suggest picking another fan instead of treating it as a generic error. get_reply_suggestions and get_dm_thread_and_suggestions run Scan Thread plus Circe/Venus/Flirt reply lines synchronously (blocking until done). For a long scan while the creator does something else (e.g. open Analytics or ask get_stats), use start_thread_scan_async instead: it queues a background scan, may navigate them to Analytics, and registers tasks in voice memory. Use get_task_status to see pending or completed tasks and navigation. When they want both a background scan and stats, call start_thread_scan_async first, then get_stats; the app will return them to Messages with suggestions when every barrier task finishes—do not claim the scan is done until get_task_status shows the scan task done or the creator sees the in-app handoff. send_message sends a direct message to a specific fan. You can read users by name, scan any thread, and send a DM to that user. list_content shows their content calendar and scheduled posts.${focusedFanLine}${voiceMemoryLine}

DM name lookup: Tool output includes spellback ("I heard …") and [divine_lookup_meta:…]. Say the spellback out loud. If the meta says fuzzy_confirm_required, multi_match_confirm_required, or fuzzy_ambiguous, ask the creator to confirm which fan or fanId before continuing—do not insist the chat is already open. Do not call get_dm_conversations or lookup_fan again with the same name query in the same turn; ask a clarifying question instead.

Speak in second person ("you"). Keep replies actionable but advisory. Be concise; this is a live conversation. Text chat has the full tool list; voice uses the same server-side tools—if something fails, suggest using Divine text chat for that action.

    The creator only uploads one photo and talks to you—no typing. You manage everything by voice. When they say "how does this look", "rate this", or "analyze my photo", use analyze_content (their uploaded photo is analyzed automatically). For a Supabase storage image URL they paste, use analyze_image_from_url. When they say "write a caption", "caption this", or "what should I say", use generate_caption. Prefer get_dm_thread_and_suggestions when they need both thread context and reply ideas. draft_fan_reply drafts a fan-facing line from Mimic Test (review only). When they say "will this do well" or "viral potential", use predict_viral. When they say "post this and send to my fans" or "share with my subs", chain: generate_caption first, then content_publish with the caption, then mass_dm with a teaser to active subs—the app may ask them to confirm before sending. For "who might leave" or "retention" use get_retention_insights. For "whales", "top fans", or "high-value fans" use get_whale_advice or list_fans with filter=top. For "which fans spent the most", "top 10 fans", or "who are my biggest spenders" use list_fans with filter=top (and optional sort). For "how did my mass message perform" or "last mass DM stats" use get_message_engagement with type=mass. For "publish my saved post" or "send my saved mass DM" use publish_queue_item with the queue id (you may need to describe that they should confirm in the app if you do not have the queue id). You can create in-app reminders with send_notification. For leaks/DMCA review use list_leak_alerts or run_leak_scan only when they ask. Reputation identities: add_reputation_identity / remove_reputation_identity for manual mention handles; add_leak_search_identity / remove_leak_search_identity for former usernames and leak title hints used in Protection search. run_reputation_scan discovers new web/social mentions. trigger_reputation_briefing generates the aggregate briefing (Pro); get_reputation_briefing reads the latest saved briefing; list_reputation_briefings lists recent history. get_fan_thread_insights returns stored thread snapshot, merged personality profile_json, and fan AI summary for a fanId (background refresh keeps snapshots updated after new messages). refresh_fan_thread_scan forces a fresh fetch and profile merge for a fanId. To open Messages for a specific fan once you know their fanId, prefer ui_focus_fan; use ui_navigate to /dashboard/messages only for the inbox without a fan. get_dm_conversations resolves names to fanIds; prefer lookup_fan for a quick name/username search (cache first). run_ai_studio_tool runs a dashboard AI Studio tool by toolId plus args (same tools as AI Studio). The app does not auto-disconnect for short silence by default; an optional long idle timeout may be configured server-side and does not apply while tools run or while you (the assistant) are speaking. Ask "anything else?" before they go quiet too long, and use end_call only when they are clearly done. Do NOT call end_call until you have finished speaking after any tools (including slow ones like analyze_content, pricing, or publish). After completing their request—or if they interrupt—still ask out loud: "Is there anything else you want me to do?" and wait for their answer. Immediately after asking that question, call voice_allow_user_hangup so the creator can use the End button when strict hangup mode is enabled. Only after they clearly indicate they are done or say goodbye, say a brief goodbye and then call end_call. Never end_call in the same turn as a tool before you have verbally confirmed they need nothing else. For any other action (send a mass DM, get stats, publish content, create a task), briefly say what you are about to do, then call the appropriate tool. For risky actions (mass DM, pricing, publish, publish_queue_item) the app may ask the creator to confirm; if so, tell them to say "yes" or confirm in the app. Always describe the action before calling a tool. The creator's connected platforms are OnlyFans and Fansly; use these names when referring to platforms or subscribers.`

    const tools = [
      {
        type: 'function' as const,
        name: 'analyze_content',
        description:
          'Rate the creator\'s uploaded photo for commercial appeal (score 1-10, strengths, improvements). Use when they say "how does this look", "rate this", "analyze my photo", or "will this sell". The app sends their photo automatically.',
        parameters: {
          type: 'object',
          properties: {
            description: { type: 'string', description: 'Optional short description of the content if the creator said something' },
            niche: { type: 'string', description: 'Optional niche e.g. fitness, cosplay' },
            platform: { type: 'string', enum: ['onlyfans', 'fansly'], description: 'Platform context' },
          },
        },
      },
      {
        type: 'function' as const,
        name: 'generate_caption',
        description:
          'Generate captions, hashtags, and teaser/PPV copy for the creator\'s content. Use when they say "write a caption", "caption this", "what should I say for this post", or before posting. Describe the content if they mentioned it.',
        parameters: {
          type: 'object',
          properties: {
            contentType: { type: 'string', description: 'e.g. photo, video, photoset' },
            contentDescription: { type: 'string', description: 'What the content is about' },
            platform: { type: 'string', enum: ['onlyfans', 'fansly'] },
          },
          required: ['contentDescription'],
        },
      },
      {
        type: 'function' as const,
        name: 'predict_viral',
        description:
          'Predict viral potential (score 0-100) and engagement tips for content. Use when they ask "will this do well", "viral potential", or "how will this perform".',
        parameters: {
          type: 'object',
          properties: {
            contentDescription: { type: 'string', description: 'What the content is' },
            contentType: { type: 'string', description: 'e.g. photo, video' },
            platform: { type: 'string', enum: ['onlyfans', 'fansly'] },
          },
          required: ['contentDescription'],
        },
      },
      {
        type: 'function' as const,
        name: 'get_retention_insights',
        description:
          'Get churn risk and retention advice for subscribers. Use when the creator asks about keeping fans, who might leave, at-risk subs, or retention.',
        parameters: {
          type: 'object',
          properties: {
            fanData: { type: 'string', description: 'Optional summary of fan or segment' },
            recentActivity: { type: 'string', description: 'Optional recent activity' },
            subscriptionLength: { type: 'string', description: 'Optional e.g. 3 months' },
            spendingHistory: { type: 'string', description: 'Optional spending summary' },
          },
        },
      },
      {
        type: 'function' as const,
        name: 'get_whale_advice',
        description:
          'Get advice for engaging high-value (whale) fans. Use when they ask about top spenders, VIPs, or maximizing tips from best fans.',
        parameters: {
          type: 'object',
          properties: {
            context: { type: 'string', description: 'Optional context e.g. segment or goal' },
          },
        },
      },
      {
        type: 'function' as const,
        name: 'get_dm_conversations',
        description:
          'List recent DM conversations with fan names, usernames, and fanIds (OnlyFans). Use when the creator asks who messaged, recent chats, or to find a fan by name so you can scan their thread or send a DM.',
        parameters: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max conversations to return (default 20)' },
            query: {
              type: 'string',
              description:
                'Optional name or username substring to filter conversations (case-insensitive).',
            },
          },
        },
      },
      {
        type: 'function' as const,
        name: 'get_dm_thread',
        description:
          'Scan and read the full message thread with a specific fan. Use fanId from get_dm_conversations. Use when the creator wants to see the chat or before suggesting a reply.',
        parameters: {
          type: 'object',
          properties: {
            fanId: { type: 'string', description: 'Fan id from get_dm_conversations' },
          },
          required: ['fanId'],
        },
      },
      {
        type: 'function' as const,
        name: 'get_reply_suggestions',
        description:
          'Scan the thread and get Circe, Venus, and Flirt reply suggestions for a fan. Opens Messages for that fan and shows the same suggestion UI as the in-chat buttons while you read. Use fanId from get_dm_conversations. Pass openPanel when they ask only for scan, or only Venus/Circe/Flirt lines.',
        parameters: {
          type: 'object',
          properties: {
            fanId: { type: 'string', description: 'Fan id from get_dm_conversations' },
            openPanel: {
              type: 'string',
              enum: ['scan', 'circe', 'venus', 'flirt', 'all'],
              description:
                'Optional. scan = scan insights only; circe|venus|flirt = open that reply panel with multiple lines; all = load everything without forcing a reply tab (default).',
            },
          },
          required: ['fanId'],
        },
      },
      {
        type: 'function' as const,
        name: 'get_dm_thread_and_suggestions',
        description:
          'Preferred: fetch DM thread and Circe/Venus/Flirt reply suggestions in one step (faster than separate calls). Use fanId from get_dm_conversations. Pass openPanel when they ask only for Venus/Circe/Flirt replies so the app opens that panel.',
        parameters: {
          type: 'object',
          properties: {
            fanId: { type: 'string', description: 'Fan id from get_dm_conversations' },
            openPanel: {
              type: 'string',
              enum: ['scan', 'circe', 'venus', 'flirt', 'all'],
              description:
                'Optional. scan = emphasize scan insights; circe|venus|flirt = open that reply panel; all = default (full thread + suggestions, no forced reply tab).',
            },
          },
          required: ['fanId'],
        },
      },
      {
        type: 'function' as const,
        name: 'start_thread_scan_async',
        description:
          'Queue a background DM thread scan (Circe/Venus/Flirt package) without blocking the voice session. Use when the scan may take a long time and the creator may switch to Analytics or ask for stats while it runs. Returns immediately; use get_task_status for progress. The app may open Analytics; when all barrier tasks complete, it returns to Messages with suggestions.',
        parameters: {
          type: 'object',
          properties: {
            fanId: { type: 'string', description: 'Fan id from get_dm_conversations or focused fan' },
            openPanel: {
              type: 'string',
              enum: ['scan', 'circe', 'venus', 'flirt', 'all'],
              description: 'Optional highlight panel when suggestions are shown after the scan completes.',
            },
          },
          required: ['fanId'],
        },
      },
      {
        type: 'function' as const,
        name: 'get_task_status',
        description:
          'Read voice multitask state: pending/done tasks (async scan, get_stats) and deferred navigation. Use after start_thread_scan_async or when the creator asks if the scan or stats are ready.',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
      {
        type: 'function' as const,
        name: 'voice_allow_user_hangup',
        description:
          'Call immediately after you ask out loud "Is there anything else you want me to do?" (or equivalent). Unlocks the manual End call button for the creator. Still use end_call only when they are clearly done.',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
      {
        type: 'function' as const,
        name: 'lookup_fan',
        description:
          'Fast fan lookup by name or username substring (cached recent DMs first, then live list). Returns fanIds for ui_focus_fan.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Name or username substring' },
          },
          required: ['query'],
        },
      },
      {
        type: 'function' as const,
        name: 'draft_fan_reply',
        description:
          'Draft a fan-facing DM in the creator\'s voice using Mimic Test settings. Review only; does not send. Requires Mimic consent. Use fanId from get_dm_conversations.',
        parameters: {
          type: 'object',
          properties: { fanId: { type: 'string' } },
          required: ['fanId'],
        },
      },
      {
        type: 'function' as const,
        name: 'analyze_image_from_url',
        description:
          'Vision analysis for an image at a Supabase storage or project-hosted URL (Divine full). Not for arbitrary external sites.',
        parameters: {
          type: 'object',
          properties: { url: { type: 'string', description: 'https image URL' } },
          required: ['url'],
        },
      },
      {
        type: 'function' as const,
        name: 'send_message',
        description:
          'Send a direct message to a specific fan. Use fanId from get_dm_conversations. You can find the user by name with get_dm_conversations first, then send_message to that fanId.',
        parameters: {
          type: 'object',
          properties: {
            fanId: { type: 'string', description: 'Fan id from conversations list' },
            message: { type: 'string', description: 'Message text to send' },
            platform: { type: 'string', enum: ['onlyfans', 'fansly'], description: 'Platform' },
            price: { type: 'number', description: 'Optional PPV price' },
            mediaIds: { type: 'array', items: { type: 'string' } },
          },
          required: ['fanId', 'message'],
        },
      },
      {
        type: 'function' as const,
        name: 'list_content',
        description:
          'List the creator\'s content (posts, schedule). Use when they ask what is scheduled, content calendar, or upcoming posts.',
        parameters: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max items (default 20)' },
            status: { type: 'string', enum: ['draft', 'scheduled', 'published'], description: 'Filter by status' },
          },
        },
      },
      {
        type: 'function' as const,
        name: 'mass_dm',
        description:
          'Send a mass message to subscribers on one or more platforms (OnlyFans, Fansly). Messages can include paid (PPV) content: optional price and/or media IDs so fans pay to unlock. Use when the creator asks to send a message to fans, subs, or a segment. Describe the action and recipient count before calling.',
        parameters: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'The message text to send' },
            platforms: {
              type: 'array',
              items: { type: 'string', enum: ['onlyfans', 'fansly'] },
              description: 'Platforms to send to',
            },
            segment: { type: 'string', description: 'Optional segment e.g. active, renewing, expired' },
            filter: { type: 'string', enum: ['all', 'active', 'expired', 'renewing'], description: 'Subscriber filter' },
            price: { type: 'number', description: 'Optional PPV price (e.g. 4.99) so fans pay to unlock this message' },
            mediaIds: { type: 'array', items: { type: 'string' }, description: 'Optional media IDs (photos/videos) attached to the message' },
          },
          required: ['message'],
        },
      },
      {
        type: 'function' as const,
        name: 'get_stats',
        description:
          'Get analytics summary: revenue, fans, and platform breakdown for the creator. Use when they ask how they are doing, revenue, stats, or analytics.',
        parameters: {
          type: 'object',
          properties: {
            period: { type: 'string', description: 'Optional e.g. last_7_days' },
            platform: { type: 'string', description: 'Optional platform filter' },
          },
        },
      },
      {
        type: 'function' as const,
        name: 'content_publish',
        description:
          'Publish or schedule a post to OnlyFans/Fansly. Use when the creator asks to post or publish content. Describe what will be published before calling.',
        parameters: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'Post text/content' },
            platforms: {
              type: 'array',
              items: { type: 'string', enum: ['onlyfans', 'fansly'] },
            },
            scheduledFor: { type: 'string', description: 'Optional ISO date for scheduling' },
          },
          required: ['content', 'platforms'],
        },
      },
      {
        type: 'function' as const,
        name: 'create_task',
        description:
          'Create a Divine Manager task (suggestion) for the creator. Use when they ask to add something to their plan or task list.',
        parameters: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'Task type e.g. content_idea, dm_welcome, post_suggestion' },
            summary: { type: 'string', description: 'Short description of the task' },
          },
          required: ['summary'],
        },
      },
      {
        type: 'function' as const,
        name: 'adjust_price',
        description:
          'Request or suggest a pricing change. Currently returns guidance; actual price changes are applied by the creator in platform settings.',
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
      {
        type: 'function' as const,
        name: 'get_notifications',
        description:
          'Get a summary of OnlyFans notifications (new fans, tips, messages). Use when the creator asks what they missed, any new fans, or any new tips.',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
      {
        type: 'function' as const,
        name: 'list_notifications',
        description:
          'List recent OnlyFans notifications with type, user, and text. Use when the creator wants details about what happened recently.',
        parameters: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max notifications (default 25)' },
            offset: { type: 'number' },
            tab: { type: 'string', description: 'Optional OnlyFans notifications tab key' },
          },
        },
      },
      {
        type: 'function' as const,
        name: 'mark_notifications_read',
        description:
          'Mark all OnlyFans notifications as read. Use only when the creator clearly asks to clear notifications on OnlyFans.',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
      {
        type: 'function' as const,
        name: 'send_notification',
        description:
          'Create an in-app notification (reminder) for the creator. Use when you want to leave a reminder they will see in the app (e.g. "Check your OnlyFans DMs tomorrow", "Review pricing suggestions").',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Short title for the notification' },
            description: { type: 'string', description: 'Body or reminder text' },
            link: { type: 'string', description: 'Optional app link e.g. /dashboard/divine-manager' },
          },
          required: ['title', 'description'],
        },
      },
      {
        type: 'function' as const,
        name: 'list_fans',
        description:
          'List fans from OnlyFans: active, expired, latest, top spenders, or all. Use when the creator asks who are my fans, top fans, expired fans, or how many subscribers.',
        parameters: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              enum: ['all', 'active', 'expired', 'latest', 'top'],
              description: 'active (default), expired, latest, top, or all',
            },
            limit: { type: 'number', description: 'Max items (default 25)' },
            offset: { type: 'number' },
            sort: {
              type: 'string',
              enum: ['total', 'subscriptions', 'tips', 'messages', 'posts', 'streams'],
              description: 'For filter=top: sort by spend category',
            },
          },
        },
      },
      {
        type: 'function' as const,
        name: 'get_fan_subscription_history',
        description:
          'Get subscription history for a specific fan (renewals, expirations). Use when they ask about a fan\'s subscription history.',
        parameters: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'Fan user id from list_fans or get_dm_conversations' },
            limit: { type: 'number' },
            offset: { type: 'number' },
          },
          required: ['userId'],
        },
      },
      {
        type: 'function' as const,
        name: 'list_followings',
        description:
          'List who the creator follows on OnlyFans (active, expired, or all). Use when they ask about followings.',
        parameters: {
          type: 'object',
          properties: {
            filter: { type: 'string', enum: ['all', 'active', 'expired'], description: 'Default all' },
            limit: { type: 'number' },
            offset: { type: 'number' },
          },
        },
      },
      {
        type: 'function' as const,
        name: 'get_top_message',
        description:
          'Get the top-performing message by purchases and its buyers. Use when they ask which message did best or who bought my best message.',
        parameters: {
          type: 'object',
          properties: {
            startDate: { type: 'string' },
            endDate: { type: 'string' },
            period: { type: 'string' },
          },
        },
      },
      {
        type: 'function' as const,
        name: 'get_message_engagement',
        description:
          'Get direct or mass message engagement (list and chart). Use when they ask how did my messages perform or mass message stats.',
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
      {
        type: 'function' as const,
        name: 'publish_queue_item',
        description:
          'Publish a saved post or mass message from the queue. Use when they say publish my saved post or send my saved mass DM. May require confirmation.',
        parameters: {
          type: 'object',
          properties: {
            queueId: { type: 'string', description: 'Queue item id to publish' },
          },
          required: ['queueId'],
        },
      },
      {
        type: 'function' as const,
        name: 'list_leak_alerts',
        description: 'List recent leak / DMCA candidate alerts from Protection.',
        parameters: {
          type: 'object',
          properties: { limit: { type: 'number' } },
        },
      },
      {
        type: 'function' as const,
        name: 'run_leak_scan',
        description:
          'Search for leaked content and add candidates to Protection. Only when the creator asks to scan for leaks or prepare DMCA review.',
        parameters: {
          type: 'object',
          properties: {
            aliases: { type: 'array', items: { type: 'string' } },
            urls: { type: 'array', items: { type: 'string' } },
            strict: { type: 'boolean' },
          },
        },
      },
      {
        type: 'function' as const,
        name: 'trigger_reputation_briefing',
        description: 'Generate or refresh the AI reputation briefing (Mentions, Pro). Optional handles to scope identities.',
        parameters: {
          type: 'object',
          properties: {
            handles: { type: 'array', items: { type: 'string' }, description: 'Optional subset of identities' },
          },
        },
      },
      {
        type: 'function' as const,
        name: 'list_reputation_mentions',
        description: 'List recent reputation mentions.',
        parameters: {
          type: 'object',
          properties: { limit: { type: 'number' } },
        },
      },
      {
        type: 'function' as const,
        name: 'add_reputation_identity',
        description: 'Add one or more manual reputation search handles (mentions / identity list).',
        parameters: {
          type: 'object',
          properties: {
            handles: {
              oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
              description: 'Handle(s) to add (with or without @)',
            },
          },
          required: ['handles'],
        },
      },
      {
        type: 'function' as const,
        name: 'remove_reputation_identity',
        description: 'Remove manual reputation search handle(s).',
        parameters: {
          type: 'object',
          properties: {
            handles: {
              oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
            },
          },
          required: ['handles'],
        },
      },
      {
        type: 'function' as const,
        name: 'add_leak_search_identity',
        description:
          'Add former usernames and/or leak_search_title_hints for DMCA / Protection leak search (rebrand handles, content titles).',
        parameters: {
          type: 'object',
          properties: {
            former_usernames: { type: 'array', items: { type: 'string' } },
            leak_search_title_hints: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      {
        type: 'function' as const,
        name: 'remove_leak_search_identity',
        description: 'Remove former usernames and/or leak title hints from leak search.',
        parameters: {
          type: 'object',
          properties: {
            former_usernames: { type: 'array', items: { type: 'string' } },
            leak_search_title_hints: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      {
        type: 'function' as const,
        name: 'run_reputation_scan',
        description: 'Run web/social reputation discovery for the creator’s identities (Serper pipeline).',
        parameters: {
          type: 'object',
          properties: {
            mode: { type: 'string', enum: ['wide', 'social', 'both'] },
            handles: { type: 'array', items: { type: 'string' } },
            limitPerQuery: { type: 'number' },
          },
        },
      },
      {
        type: 'function' as const,
        name: 'get_fan_thread_insights',
        description:
          'Latest stored DM thread snapshot, merged personality profile (profile_json), iteration, and OnlyFans fan AI summary for a fan.',
        parameters: {
          type: 'object',
          properties: { fanId: { type: 'string' } },
          required: ['fanId'],
        },
      },
      {
        type: 'function' as const,
        name: 'refresh_fan_thread_scan',
        description:
          'Re-fetch the DM thread from OnlyFans, update the stored snapshot, and merge/refine the structured fan personality profile. Use when the creator asks to refresh or rescan a fan’s thread.',
        parameters: {
          type: 'object',
          properties: {
            fanId: { type: 'string' },
            force: { type: 'boolean', description: 'If true, bypass debounce and run profile merge' },
          },
          required: ['fanId'],
        },
      },
      {
        type: 'function' as const,
        name: 'get_reputation_briefing',
        description: 'Read the latest saved AI reputation briefing JSON from Mentions.',
        parameters: { type: 'object', properties: {} },
      },
      {
        type: 'function' as const,
        name: 'list_reputation_briefings',
        description: 'List recent saved reputation briefing history (newest first).',
        parameters: {
          type: 'object',
          properties: { limit: { type: 'number' } },
        },
      },
      {
        type: 'function' as const,
        name: 'run_ai_studio_tool',
        description:
          'Run an AI Studio tool by id (e.g. caption-generator, viral-predictor) with a JSON args object matching that tool’s form fields.',
        parameters: {
          type: 'object',
          properties: {
            toolId: { type: 'string', description: 'Tool id from AI Studio / lib/ai-tools-data' },
            args: { type: 'object', description: 'Arguments for that tool (e.g. contentDescription, platform)' },
          },
          required: ['toolId', 'args'],
        },
      },
      {
        type: 'function' as const,
        name: 'get_integrations_summary',
        description: 'Summarize connected platforms and social handles.',
        parameters: { type: 'object', properties: {} },
      },
      {
        type: 'function' as const,
        name: 'get_scheduled_content_summary',
        description: 'List scheduled content items (Cosmic calendar).',
        parameters: {
          type: 'object',
          properties: { limit: { type: 'number' } },
        },
      },
      {
        type: 'function' as const,
        name: 'list_cosmic_calendar',
        description: 'Same as scheduled content summary.',
        parameters: {
          type: 'object',
          properties: { limit: { type: 'number' } },
        },
      },
      {
        type: 'function' as const,
        name: 'ui_navigate',
        description:
          'Open a dashboard screen in the app. For Divine Manager sections use ?section=mimic (Mimic Test), voice (voice call), tasks (today plan), or alerts (urgent jobs). For Messages, use path /dashboard/messages for the inbox only; to open a specific fan’s chat use ui_focus_fan with fanId instead.',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              enum: [
                '/dashboard',
                '/dashboard/messages',
                '/dashboard/content',
                '/dashboard/protection',
                '/dashboard/mentions',
                '/dashboard/fans',
                '/dashboard/analytics',
                '/dashboard/divine-manager',
                '/dashboard/divine-manager?section=mimic',
                '/dashboard/divine-manager?section=voice',
                '/dashboard/divine-manager?section=tasks',
                '/dashboard/divine-manager?section=alerts',
                '/dashboard/ai-studio',
                '/dashboard/ai-studio?tab=overview',
                '/dashboard/ai-studio?tab=tools',
                '/dashboard/ai-studio?tab=chatter',
                '/dashboard/ai-studio?tab=cosmic',
                '/dashboard/ai-studio?ai=circe',
                '/dashboard/ai-studio?ai=venus',
                '/dashboard/ai-studio?tab=tools&ai=circe',
                '/dashboard/ai-studio/tools/caption-generator',
                '/dashboard/social',
                '/dashboard/settings',
                '/dashboard/guide',
              ],
            },
          },
          required: ['path'],
        },
      },
      {
        type: 'function' as const,
        name: 'ui_focus_fan',
        description: 'Open Messages and focus a fan by id.',
        parameters: {
          type: 'object',
          properties: { fanId: { type: 'string' } },
          required: ['fanId'],
        },
      },
      {
        type: 'function' as const,
        name: 'end_call',
        description:
          'End the voice call only after you have asked "Is there anything else you want me to do?" and the creator has indicated they are done or said goodbye. Speak your goodbye first, then call this. Do not call immediately after tools or while the user may still be listening.',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
    ]

    const voice = getDivineVoice(notify?.voice)
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
