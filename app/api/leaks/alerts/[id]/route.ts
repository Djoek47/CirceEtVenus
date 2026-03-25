import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { LeakDistributionIntent, LeakUserCaseStatus } from '@/lib/types'

const USER_CASE_STATUSES: LeakUserCaseStatus[] = [
  'open',
  'resolved',
  'contacted',
  'unresolved',
  'needs_help',
  'snoozed',
  'waived',
]

const DISTRIBUTION_INTENTS: LeakDistributionIntent[] = [
  'unspecified',
  'paid_only_elsewhere',
  'ok_if_free',
  'cross_post_consented',
]

type PatchBody = {
  user_case_status?: LeakUserCaseStatus
  snooze_until?: string | null
  creator_distribution_intent?: LeakDistributionIntent | null
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Invalid alert id' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: PatchBody
  try {
    body = (await req.json()) as PatchBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (body.user_case_status !== undefined) {
    if (!USER_CASE_STATUSES.includes(body.user_case_status)) {
      return NextResponse.json({ error: 'Invalid user_case_status' }, { status: 400 })
    }
    updates.user_case_status = body.user_case_status
    if (body.user_case_status !== 'snoozed') {
      updates.snooze_until = null
    }
  }

  if (body.snooze_until !== undefined) {
    if (body.snooze_until === null) {
      updates.snooze_until = null
    } else {
      const t = Date.parse(body.snooze_until)
      if (Number.isNaN(t)) {
        return NextResponse.json({ error: 'Invalid snooze_until' }, { status: 400 })
      }
      updates.snooze_until = new Date(t).toISOString()
    }
  }

  if (body.creator_distribution_intent !== undefined) {
    if (body.creator_distribution_intent === null) {
      updates.creator_distribution_intent = null
    } else if (!DISTRIBUTION_INTENTS.includes(body.creator_distribution_intent)) {
      return NextResponse.json({ error: 'Invalid creator_distribution_intent' }, { status: 400 })
    } else {
      updates.creator_distribution_intent = body.creator_distribution_intent
    }
  }

  if (Object.keys(updates).length <= 1) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('leak_alerts')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, alert: data })
}
