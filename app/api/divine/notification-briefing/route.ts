import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { getFanNotifySnapshot } from '@/lib/divine/notification-fan-context'

export type NotificationBriefingItem = {
  notification_id: string
  summary: string
  suggested_action: string
  todos: string[]
}

export type NotificationBriefingResponse = {
  script: string
  items: NotificationBriefingItem[]
}

/**
 * POST { notification_ids?: string[], all_unread?: boolean }
 * LLM briefing from selected notifications + optional fan thread/classification context.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as {
      notification_ids?: string[]
      all_unread?: boolean
    }

    let query = supabase
      .from('notifications')
      .select('id, title, description, type, platform, platform_fan_id, metadata, read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(80)

    if (body.all_unread === true) {
      query = query.eq('read', false)
    } else if (Array.isArray(body.notification_ids) && body.notification_ids.length > 0) {
      const ids = body.notification_ids.map((x) => String(x).trim()).filter(Boolean).slice(0, 40)
      query = query.in('id', ids)
    } else {
      return NextResponse.json(
        { error: 'Provide notification_ids or all_unread: true' },
        { status: 400 },
      )
    }

    const { data: rows, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const list = rows ?? []
    if (list.length === 0) {
      return NextResponse.json({
        script: 'No notifications to brief.',
        items: [],
      } satisfies NotificationBriefingResponse)
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Briefing requires OPENAI_API_KEY' },
        { status: 503 },
      )
    }

    const contextBlocks: string[] = []
    for (const n of list) {
      const row = n as {
        id: string
        title?: string
        description?: string
        type?: string
        platform?: string | null
        platform_fan_id?: string | null
        metadata?: unknown
      }
      let extra = ''
      if (row.platform_fan_id && (row.platform === 'onlyfans' || row.platform === 'fansly')) {
        const snap = await getFanNotifySnapshot(
          supabase,
          user.id,
          row.platform,
          row.platform_fan_id,
        )
        const bits: string[] = []
        if (snap.creator_classification) bits.push(`classification: ${snap.creator_classification}`)
        if (snap.thread_excerpt) bits.push(`thread_excerpt: ${snap.thread_excerpt.slice(0, 220)}`)
        if (snap.profile_tone) bits.push(`tone: ${snap.profile_tone}`)
        if (snap.tier) bits.push(`tier: ${snap.tier}`)
        if (bits.length) extra = `\nContext: ${bits.join(' | ')}`
      }
      contextBlocks.push(
        `- [${row.id}] ${row.title ?? ''}: ${(row.description ?? '').slice(0, 400)}${extra}`,
      )
    }

    const { generateText } = await import('ai')
    const { gateway } = await import('@ai-sdk/gateway')
    const { text } = await generateText({
      model: gateway('openai/gpt-4o-mini'),
      temperature: 0.25,
      maxOutputTokens: 2200,
      prompt: `You are a concise executive assistant for an adult creator CRM. Given notification lines, output VALID JSON ONLY (no markdown).

Schema:
{
  "script": string,
  "items": Array<{
    "notification_id": string,
    "summary": string,
    "suggested_action": string,
    "todos": string[]
  }>
}

Rules:
- One item per notification id that appears in the input; same order as listed.
- script: short spoken-style rundown (2–6 sentences total), professional tone.
- summary: one line per item; suggested_action: one line; todos: 0–3 short imperative tasks each.
- Do not invent notification ids. Use only ids from brackets [uuid] in the input.
- Respect boundaries: no minors, no illegal content.

Notifications:
${contextBlocks.join('\n')}`,
    })

    const raw = (text || '').trim()
    const jsonStart = raw.indexOf('{')
    const jsonEnd = raw.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd <= jsonStart) {
      return NextResponse.json({ error: 'Briefing parse failed' }, { status: 502 })
    }
    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as NotificationBriefingResponse
    if (typeof parsed.script !== 'string' || !Array.isArray(parsed.items)) {
      return NextResponse.json({ error: 'Briefing shape invalid' }, { status: 502 })
    }

    return NextResponse.json({
      script: parsed.script.slice(0, 8000),
      items: parsed.items.slice(0, 40),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Briefing failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
