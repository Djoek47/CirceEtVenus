import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ReputationBriefingPayload } from '@/lib/reputation/briefing'
import { runReputationBriefingCore } from '@/lib/reputation/briefing-server'

const PRO_PLANS = ['venus-pro', 'circe-elite', 'divine-duo']

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

  const result = await runReputationBriefingCore(supabase, user.id, body)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({
    success: true,
    briefing: result.briefing,
    onboarding: result.onboarding,
    message: result.message,
    storedAt: result.storedAt,
  } as {
    success: boolean
    briefing: ReputationBriefingPayload
    onboarding: boolean
    message?: string
    storedAt: string
  })
}
