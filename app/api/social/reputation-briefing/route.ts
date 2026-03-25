import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  compileReputationBriefing,
  type ReputationBriefingIdentity,
  type ReputationBriefingPayload,
} from '@/lib/reputation/briefing'
import { runReputationScanCore } from '@/lib/reputation/run-reputation-scan'
import { filterHandlesToAllowed, loadMergedHandlesForUser } from '@/lib/scan-identity'

const PRO_PLANS = ['venus-pro', 'circe-elite', 'divine-duo']
const MENTION_CAP = 80
const DAYS = 30

function isProPlan(planId: string | null | undefined): boolean {
  const n = planId?.toLowerCase() || null
  return Boolean(n && PRO_PLANS.includes(n))
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { handles?: string[] }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const planId = (subscription as { plan_id?: string } | null)?.plan_id
  if (!isProPlan(planId)) {
    return NextResponse.json({ error: 'Venus Pro required for AI reputation briefing' }, { status: 403 })
  }

  const xaiKey = process.env.XAI_API_KEY
  if (!xaiKey) {
    return NextResponse.json({ error: 'AI briefing is not configured' }, { status: 503 })
  }

  const since = new Date()
  since.setDate(since.getDate() - DAYS)

  const [{ data: profileRow }, nichesSet, mergedHandles] = await Promise.all([
    supabase
      .from('profiles')
      .select('reputation_manual_handles, reputation_display_name, reputation_platform_handles')
      .eq('id', user.id)
      .maybeSingle(),
    (async () => {
      const set = new Set<string>()
      const { data: platforms } = await supabase
        .from('platform_connections')
        .select('niches')
        .eq('user_id', user.id)
        .eq('is_connected', true)
      for (const p of platforms || []) {
        const n = (p as { niches?: string[] | null }).niches
        if (Array.isArray(n)) {
          for (const x of n) set.add(String(x))
        }
      }
      return set
    })(),
    loadMergedHandlesForUser(supabase, user.id),
  ])
  const requestedHandles = Array.isArray(body.handles)
    ? body.handles.filter((h): h is string => typeof h === 'string' && h.trim().length > 0)
    : undefined
  if (Array.isArray(body.handles) && requestedHandles && requestedHandles.length === 0) {
    return NextResponse.json(
      { error: 'Select at least one identity before generating a briefing.' },
      { status: 400 },
    )
  }
  const selectedHandles =
    requestedHandles && requestedHandles.length > 0
      ? filterHandlesToAllowed(requestedHandles, mergedHandles)
      : Array.from(mergedHandles)
  if (selectedHandles.length === 0) {
    return NextResponse.json(
      { error: 'No valid identities selected. Add or select at least one handle.' },
      { status: 400 },
    )
  }

  let { data: rows, error: fetchErr } = await supabase
    .from('reputation_mentions')
    .select(
      'id, source_url, title, content_preview, platform, sentiment, ai_category, ai_rationale, ai_reputation_impact, ai_recommended_action, scan_channel, detected_at',
    )
    .eq('user_id', user.id)
    .gte('detected_at', since.toISOString())
    .order('detected_at', { ascending: false })
    .limit(MENTION_CAP)

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  if (!rows || rows.length === 0) {
    await runReputationScanCore(supabase, user.id, {
      mode: 'both',
      handles: selectedHandles,
    })
    const second = await supabase
      .from('reputation_mentions')
      .select(
        'id, source_url, title, content_preview, platform, sentiment, ai_category, ai_rationale, ai_reputation_impact, ai_recommended_action, scan_channel, detected_at',
      )
      .eq('user_id', user.id)
      .gte('detected_at', since.toISOString())
      .order('detected_at', { ascending: false })
      .limit(MENTION_CAP)
    rows = second.data
    if (second.error) {
      return NextResponse.json({ error: second.error.message }, { status: 500 })
    }
  }

  const list = rows || []

  const plat = (profileRow as { reputation_platform_handles?: Record<string, string> | null })
    ?.reputation_platform_handles
  const identity: ReputationBriefingIdentity = {
    manualHandles: selectedHandles,
    displayName: (profileRow as { reputation_display_name?: string | null })?.reputation_display_name ?? null,
    platformHandles: plat && typeof plat === 'object' ? plat : null,
  }

  try {
    const briefing = await compileReputationBriefing({
      apiKey: xaiKey,
      mentions: list.map((m) => ({
        id: m.id,
        source_url: m.source_url,
        title: m.title,
        content_preview: m.content_preview || '',
        platform: m.platform,
        sentiment: m.sentiment,
        ai_category: m.ai_category,
        ai_rationale: m.ai_rationale,
        ai_reputation_impact: m.ai_reputation_impact,
        ai_recommended_action: m.ai_recommended_action,
        scan_channel: m.scan_channel,
      })),
      niches: Array.from(nichesSet),
      identity,
    })

    if (!briefing) {
      return NextResponse.json({ error: 'Could not generate briefing' }, { status: 502 })
    }

    const now = new Date().toISOString()
    const { error: saveErr } = await supabase
      .from('profiles')
      .update({
        reputation_briefing: briefing as unknown as Record<string, unknown>,
        reputation_briefing_at: now,
      })
      .eq('id', user.id)

    if (saveErr) {
      return NextResponse.json({ error: saveErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      briefing,
      onboarding: list.length === 0,
      message:
        list.length === 0
          ? 'Briefing saved. Indexed discovery had no snippets in the last 30 days—next steps are in the briefing.'
          : undefined,
      storedAt: now,
    } as {
      success: boolean
      briefing: ReputationBriefingPayload
      onboarding: boolean
      message?: string
      storedAt: string
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Briefing failed'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
