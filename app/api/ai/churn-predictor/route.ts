import { generateText } from 'ai'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

const PRO_PLANS = ['venus-pro', 'circe-elite', 'divine-duo']

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_id, ai_credits_used, ai_credits_limit')
    .eq('user_id', user.id)
    .maybeSingle()

  const planId = (subscription as { plan_id?: string } | null)?.plan_id?.toLowerCase() || null
  const isPro = Boolean(planId && PRO_PLANS.includes(planId))
  if (!isPro) {
    return NextResponse.json({ error: 'Pro subscription required for Churn Predictor' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({})) as {
    fanId?: string
    fanData?: string
    recentActivity?: string
    subscriptionLength?: string
    spendingHistory?: string
  }

  const used = (subscription as { ai_credits_used?: number } | null)?.ai_credits_used ?? 0
  const limit = (subscription as { ai_credits_limit?: number } | null)?.ai_credits_limit ?? 100
  if (limit < 999999 && used >= limit) {
    return NextResponse.json({ error: 'AI credits exhausted' }, { status: 402 })
  }

  let fanBlock = ''
  let threadExcerpt = ''
  let profileHint = ''
  let renewalBlock = ''

  if (body.fanId && typeof body.fanId === 'string') {
    const { data: fan, error: fanErr } = await supabase
      .from('fans')
      .select(
        'id, platform, platform_fan_id, username, display_name, total_spent, subscription_status, subscription_tier, last_interaction_at, first_subscribed_at, notes',
      )
      .eq('id', body.fanId.trim())
      .eq('user_id', user.id)
      .maybeSingle()

    if (fanErr || !fan) {
      return NextResponse.json({ error: 'Fan not found' }, { status: 404 })
    }

    const f = fan as Record<string, unknown>
    const spent = Number(f.total_spent ?? 0)
    const tier = String(f.subscription_tier || 'regular')
    const status = String(f.subscription_status || 'unknown')
    const lastAt = f.last_interaction_at ? String(f.last_interaction_at) : 'unknown'
    const firstSub = f.first_subscribed_at ? String(f.first_subscribed_at) : 'unknown'
    const platform = String(f.platform || 'onlyfans')
    const pfid = f.platform_fan_id != null ? String(f.platform_fan_id) : ''

    fanBlock = [
      `Fan: @${f.username} (${f.display_name || 'no display name'})`,
      `Platform: ${platform}`,
      `CRM id: ${f.id}`,
      `Lifetime spend (recorded): ${spent}`,
      `Tier label: ${tier}`,
      `Subscription status: ${status}`,
      `First subscribed at: ${firstSub}`,
      `Last interaction at: ${lastAt}`,
      f.notes ? `Creator notes: ${String(f.notes).slice(0, 500)}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    if (pfid) {
      const { data: insight } = await supabase
        .from('fan_thread_insights')
        .select('thread_snapshot_text, summary_excerpt, profile_json')
        .eq('user_id', user.id)
        .eq('platform', platform)
        .eq('platform_fan_id', pfid)
        .maybeSingle()

      const ins = insight as Record<string, unknown> | null
      if (ins?.thread_snapshot_text && typeof ins.thread_snapshot_text === 'string') {
        threadExcerpt = ins.thread_snapshot_text.slice(0, 10000)
      }
      if (ins?.summary_excerpt && typeof ins.summary_excerpt === 'string') {
        threadExcerpt = [threadExcerpt, `Summary: ${ins.summary_excerpt}`.slice(0, 2000)].filter(Boolean).join('\n\n')
      }
      if (ins?.profile_json != null) {
        try {
          profileHint = JSON.stringify(ins.profile_json).slice(0, 4000)
        } catch {
          profileHint = ''
        }
      }
    }

    if (status === 'expired' || status === 'cancelled') {
      renewalBlock = `Fan subscription status is "${status}" — prioritize win-back: what they valued before, soft re-entry, and a clear reason to resubscribe (platform-safe offers only).`
    } else if (status === 'active') {
      renewalBlock = `Fan is currently active — focus on spend trend vs their baseline, attention before natural renewal windows, and treats that match thread signals (no explicit promises you cannot keep).`
    }
  } else {
    fanBlock = body.fanData?.trim() || 'General subscriber (no CRM row selected).'
    renewalBlock = body.subscriptionLength ? `Stated subscription context: ${body.subscriptionLength}` : ''
  }

  const manualRecent = body.recentActivity?.trim() || ''
  const manualSpend = body.spendingHistory?.trim() || ''

  const { text } = await generateText({
    model: 'anthropic/claude-sonnet-4',
    system: `You are Circe, guardian of creator revenue. You predict churn risk and give practical, platform-safe retention playbooks for OnlyFans-style businesses.

Principles:
- Use spend level vs typical "whale" thresholds when data allows; call out when spend is cooling vs their own baseline.
- Use DM thread excerpts to infer what the fan responds to (attention, exclusivity, specific content angles) without being creepy or explicit.
- If subscription is expiring, ending, or already lapsed, emphasize timely attention, authentic check-ins, and tasteful "treats" (discounts, bundles, personalized messages) that comply with platform rules.
- Never instruct harassment, manipulation of minors, or non-consensual behavior. Keep offers legal and platform-appropriate.`,
    prompt: `Analyze churn / retention for this fan.

## CRM snapshot
${fanBlock}

## Spending / activity notes (creator-supplied or inferred)
${manualSpend ? `Spending history note: ${manualSpend}` : '(No extra spending narrative provided.)'}
${manualRecent ? `Recent behavior note: ${manualRecent}` : ''}

## Renewal / status playbook
${renewalBlock || '(No special renewal flag.)'}

## Thread / personality context (may be empty)
${threadExcerpt ? `Thread excerpt (latest stored):\n${threadExcerpt}` : '(No stored thread snapshot — say what is missing and ask creator to open Messages / refresh thread scan.)'}
${profileHint ? `\nStructured profile hints:\n${profileHint}` : ''}

Respond with:
1) Churn risk (Low/Medium/High/Critical) + one-line rationale
2) Baseline spend vs current signals (cooling, steady, heating)
3) What the thread suggests they crave (themes, not explicit content)
4) Concrete next 3 actions (timing + channel: DM, post, PPV teaser, etc.)
5) "Treat" ideas that match their taste (platform-safe)
6) If expiring/lapsed: win-back sequence (short bullet timeline)
7) A ready-to-send message draft the creator can edit (warm, not desperate)`,
  })

  if (limit < 999999) {
    await supabase
      .from('subscriptions')
      .update({ ai_credits_used: used + 1 })
      .eq('user_id', user.id)
  }

  return NextResponse.json({
    content: text,
    creditsUsed: limit < 999999 ? used + 1 : used,
  })
}
