import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  generateMessageSuggestionsWithGrok,
  generateMessageSuggestionsWithOpenAI,
  NormalizedChatMessage,
} from '@/lib/ai/message-suggestions'

type Mode = 'scan' | 'circe' | 'venus'

type RequestBody = {
  mode: Mode
  platform: 'onlyfans' | 'fansly'
  fan: { id: string | number; username?: string; name?: string }
  messages: NormalizedChatMessage[]
  tonePreferences?: string[]
  niches?: string[]
  boundaries?: string[]
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as RequestBody

    if (!body || !body.mode || !body.platform || !body.fan || !Array.isArray(body.messages)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const mode: Mode = body.mode
    if (!['scan', 'circe', 'venus'].includes(mode)) {
      return NextResponse.json({ error: 'Unsupported mode' }, { status: 400 })
    }

    // Short-circuit if there is no conversation history
    const messages = (body.messages || []).filter(
      (m) => m && typeof m.text === 'string' && m.text.trim().length > 0
    )
    if (messages.length === 0) {
      return NextResponse.json(
        { mode, model: null, insights: null, suggestions: [] },
        { status: 200 }
      )
    }

    // Check subscription for Pro / Grok access
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_id, plan')
      .eq('user_id', user.id)
      .maybeSingle()

    const planId = (subscription as any)?.plan_id || (subscription as any)?.plan
    const isPro =
      !!planId && ['venus-pro', 'circe-elite', 'divine-duo'].includes(planId)

    const xaiKey = process.env.XAI_API_KEY

    const ctx = {
      mode,
      platform: body.platform,
      fan: body.fan,
      messages,
      tonePreferences: body.tonePreferences,
      niches: body.niches,
      boundaries: body.boundaries,
    }

    let result
    if (isPro && xaiKey) {
      result = await generateMessageSuggestionsWithGrok(xaiKey, ctx)
    } else {
      result = await generateMessageSuggestionsWithOpenAI(ctx)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error generating message suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to generate message suggestions' },
      { status: 500 }
    )
  }
}

