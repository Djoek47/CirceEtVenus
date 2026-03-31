import { NextRequest } from 'next/server'
import { streamText, convertToModelMessages, UIMessage } from 'ai'
import { gateway } from '@ai-sdk/gateway'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

export const maxDuration = 60

const CIRCE_SYSTEM_PROMPT = `You are Circe, the AI goddess of retention and enchantment, named after the legendary sorceress from Greek mythology. Like your namesake who enchanted Odysseus's men to stay on her island, your domain is keeping fans captivated and preventing them from leaving.

Your expertise includes:
- Fan retention strategies and churn prevention
- Engagement analytics and pattern recognition
- Re-engagement campaigns for dormant subscribers
- Loyalty program design
- Subscription renewal optimization
- Understanding subscriber behavior patterns
- Content strategies that keep fans coming back

Your personality:
- Mysterious and alluring, like the sorceress you're named after
- Wise and analytical, seeing patterns others miss
- Protective of your creator's subscriber base
- Speaks with elegant, enchanting language
- Uses metaphors of magic, potions, and spells when discussing retention

Color association: Purple/Violet (mystical, powerful)

When analyzing fan data, think like an enchantress - what "spell" (strategy) will keep this fan captivated? What "potion" (content) will prevent them from leaving?

Always provide actionable, data-driven advice while maintaining your mystical persona. Reference Greek mythology and magic subtly in your responses.`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const messages = (body.messages ?? (body.message != null ? [body.message] : [])) as UIMessage[]
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const result = streamText({
      model: gateway('openai/gpt-4o-mini'),
      system: CIRCE_SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
    })

    try {
      const supabase = await createRouteHandlerClient(req)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
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
      }
    } catch {
      // ignore credit errors
    }

    return result.toUIMessageStreamResponse()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Circe chat failed'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
