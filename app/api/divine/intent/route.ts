import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import {
  executeDivineIntentPost,
  type IntentBody,
  type DivineIntentType,
} from '@/lib/divine/divine-intent-execute'

export type { IntentBody, DivineIntentType }

export const maxDuration = 60

/** GET: List recent intent log entries for the current user (action log). */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const limit = Math.min(Number(req.nextUrl.searchParams.get('limit')) || 10, 50)
    const { data: rows, error } = await supabase
      .from('divine_intent_log')
      .select('id, intent_type, params, status, result_summary, created_at, executed_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) {
      if (error.code === '42P01') return NextResponse.json({ intents: [] })
      throw error
    }
    return NextResponse.json({ intents: rows ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch intents'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const initialBody = (await req.json().catch(() => ({}))) as IntentBody
    const result = await executeDivineIntentPost(supabase, user, initialBody)
    return NextResponse.json(result.body, { status: result.status })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Intent execution failed'
    console.error('[divine/intent]', err)
    return NextResponse.json({ error: message, status: 'failed' }, { status: 500 })
  }
}
