import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  generateMessageSuggestionsWithGrok,
  generateMessageSuggestionsWithOpenAI,
  NormalizedChatMessage,
} from '@/lib/ai/message-suggestions'

type Mode = 'scan' | 'circe' | 'venus' | 'flirt'

type RequestBody = {
  mode: Mode
  platform: 'onlyfans' | 'fansly'
  fan: { id: string | number; username?: string; name?: string }
  messages: NormalizedChatMessage[]
  tonePreferences?: string[]
  niches?: string[]
  boundaries?: string[]
  flirtControls?: {
    explicitnessLevel?: number
    inspirationKeywords?: string
  }
  creatorPronouns?: string
  creatorGenderIdentity?: string
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
    if (!['scan', 'circe', 'venus', 'flirt'].includes(mode)) {
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
      .select('plan_id, ai_credits_used')
      .eq('user_id', user.id)
      .maybeSingle()

    const rawPlanId = (subscription as any)?.plan_id as string | null | undefined
    const normalizedPlanId = rawPlanId?.toLowerCase() || null
    const isPro =
      !!normalizedPlanId && ['venus-pro', 'circe-elite', 'divine-duo'].includes(normalizedPlanId)

    const xaiKey = process.env.XAI_API_KEY
    const openaiKey = process.env.OPENAI_API_KEY

    const ctx = {
      mode,
      platform: body.platform,
      fan: body.fan,
      messages,
      tonePreferences: body.tonePreferences,
      niches: body.niches,
      boundaries: body.boundaries,
      flirtControls: body.flirtControls,
      creatorPronouns: body.creatorPronouns,
      creatorGenderIdentity: body.creatorGenderIdentity,
    }

    let result
    if (isPro && xaiKey) {
      // Pro users with Grok configured → prefer Grok
      result = await generateMessageSuggestionsWithGrok(xaiKey, ctx)
    } else if (openaiKey) {
      // Free or Pro without Grok but OpenAI is configured → use OpenAI
      result = await generateMessageSuggestionsWithOpenAI(ctx)
    } else if (xaiKey) {
      // Fallback: OpenAI not configured but Grok is – use Grok even for non‑Pro
      result = await generateMessageSuggestionsWithGrok(xaiKey, ctx)
    } else {
      // No AI provider keys configured – return a clear error instead of generic 500
      return NextResponse.json(
        { error: 'AI provider is not configured on the server' },
        { status: 503 }
      )
    }

    // Count one AI credit for this suggestion run (best effort)
    if (subscription) {
      try {
        await supabase
          .from('subscriptions')
          .update({ ai_credits_used: (subscription.ai_credits_used || 0) + 1 })
          .eq('user_id', user.id)
      } catch {
        // ignore credit errors
      }
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error generating message suggestions:', error)
    // Surface a bit more detail to help diagnose provider/env issues in production
    const message =
      typeof error?.message === 'string'
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Unknown error'

    return NextResponse.json(
      {
        error: 'Failed to generate message suggestions',
        detail: message,
      },
      { status: 500 }
    )
  }
}

