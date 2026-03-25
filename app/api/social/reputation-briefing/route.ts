import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { compileReputationBriefing, type ReputationBriefingPayload } from '@/lib/reputation/briefing'

const PRO_PLANS = ['venus-pro', 'circe-elite', 'divine-duo']
const MENTION_CAP = 80
const DAYS = 30

function isProPlan(planId: string | null | undefined): boolean {
  const n = planId?.toLowerCase() || null
  return Boolean(n && PRO_PLANS.includes(n))
}

export async function POST(req: NextRequest) {
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

  const { data: rows, error: fetchErr } = await supabase
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

  const nichesSet = new Set<string>()
  const { data: platforms } = await supabase
    .from('platform_connections')
    .select('niches')
    .eq('user_id', user.id)
    .eq('is_connected', true)

  for (const p of platforms || []) {
    const n = (p as { niches?: string[] | null }).niches
    if (Array.isArray(n)) {
      for (const x of n) nichesSet.add(String(x))
    }
  }

  const list = rows || []
  if (list.length === 0) {
    return NextResponse.json({
      success: true,
      briefing: null as ReputationBriefingPayload | null,
      onboarding: true,
      message:
        'No mentions in the last 30 days from indexed discovery. Run Refresh Vision or connect integrations, then scan.',
      storedAt: null as string | null,
    })
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
      onboarding: false,
      storedAt: now,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Briefing failed'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
