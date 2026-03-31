import { generateText } from 'ai'
import { NextRequest } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

export const maxDuration = 45

/**
 * Server-side DM/PPV bundle pricing + copy hints for Divine Manager.
 * JSON body: goal, fan_context?, content_summary?, pricing_style?, platform?, current_price?
 */
export async function POST(req: NextRequest) {
  const supabase = await createRouteHandlerClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    goal?: string
    fan_context?: string
    content_summary?: string
    pricing_style?: string
    platform?: string
    current_price?: number
    /** Pre-built bias line from manager-chat-tools (optional). */
    pricing_bias?: string
  }

  const goal = typeof body.goal === 'string' ? body.goal.trim() : ''
  if (!goal) {
    return Response.json({ error: 'goal is required' }, { status: 400 })
  }

  const fanContext = typeof body.fan_context === 'string' ? body.fan_context.trim() : ''
  const contentSummary = typeof body.content_summary === 'string' ? body.content_summary.trim() : ''
  const platform = body.platform === 'fansly' ? 'Fansly' : 'OnlyFans'
  const style = body.pricing_style === 'maximize_revenue' || body.pricing_style === 'premium_domme' ? body.pricing_style : 'balanced'
  const bias =
    typeof body.pricing_bias === 'string' && body.pricing_bias.trim()
      ? body.pricing_bias.trim()
      : style === 'maximize_revenue'
        ? 'Bias: maximize PPV revenue; suggest assertive premium pricing where platform rules allow.'
        : style === 'premium_domme'
          ? 'Bias: premium dominance / findom-adjacent framing where platform-safe; consenting adults only.'
          : 'Bias: balance conversion and fan trust.'

  const priceLine =
    typeof body.current_price === 'number' && !Number.isNaN(body.current_price)
      ? `Current or anchor price: $${body.current_price}`
      : 'Current or anchor price: not specified'

  const system = `You help adult-platform creators (${platform}) price and describe paid DM or PPV bundles.
Follow platform safety: no minors, no non-consent, no illegal content. Practical, fan-facing sales language only.
Output plain text with clear sections:
1) Suggested price or range (USD) with one-line rationale
2) Short DM teaser the creator can paste (editable)
3) Optional: which vault/content ids to attach if listed in context
Keep under 800 words.`

  const userPrompt = `${bias}

Campaign / goal: ${goal}
Fan or thread context: ${fanContext || '(none)'}
Vault or content context: ${contentSummary || '(none)'}
${priceLine}`

  try {
    const { text } = await generateText({
      model: 'openai/gpt-4o-mini',
      system,
      prompt: userPrompt,
    })

    try {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('ai_credits_used')
        .eq('user_id', user.id)
        .maybeSingle()
      if (subscription) {
        await supabase
          .from('subscriptions')
          .update({ ai_credits_used: (subscription.ai_credits_used || 0) + 1 })
          .eq('user_id', user.id)
      }
    } catch {
      // ignore credit errors
    }

    return Response.json({ content: text?.trim() || 'No output.' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Generation failed'
    return Response.json({ error: msg }, { status: 500 })
  }
}
