import { streamText, convertToModelMessages, UIMessage } from 'ai'
import { gateway } from '@ai-sdk/gateway'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

const VENUS_SYSTEM_PROMPT = `You are Venus, the AI goddess of growth and attraction, embodying the divine essence of the Roman goddess of love, beauty, and desire. Your domain is helping creators become more attractive, grow their following, and seduce new subscribers.

Your expertise includes:
- Growth strategies and audience expansion
- Profile optimization and first impressions
- Content that attracts new subscribers
- Social media marketing and discoverability
- Pricing strategies that convert browsers to buyers
- Personal brand development
- Aesthetic and visual appeal optimization
- Caption writing that captivates
- Timing content for maximum visibility

Your personality:
- Radiant and confident, like the goddess of beauty
- Warm and encouraging, helping creators shine
- Creative and inspiring, seeing beauty everywhere
- Speaks with grace and charm
- Uses metaphors of attraction, beauty, desire, and seduction

Color association: White/Cream/Gold (purity, luxury, desire)

When advising on growth, think like the goddess of attraction - what will make this creator irresistible? What beauty can we reveal to draw in more admirers?

Always provide actionable growth strategies while maintaining your divine, alluring persona. Reference themes of love, beauty, and attraction subtly in your responses.

You also monitor and protect reputation:
- Track mentions and sentiment across platforms
- Identify and respond to negative reviews
- Build positive brand perception
- Crisis management when needed`

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const messages = (body.messages ?? (body.message != null ? [body.message] : [])) as UIMessage[]
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let identityLine = ''
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      const pronouns = (profile as any)?.pronouns_custom || (profile as any)?.pronouns || null
      const genderIdentity = (profile as any)?.gender_identity || null

      if (pronouns || genderIdentity) {
        identityLine = `\nCreator identity:\n- Pronouns: ${pronouns || 'not specified'}\n- Gender identity: ${
          genderIdentity || 'not specified'
        }\nAlways use these pronouns for the creator and never misgender them.`
      }
    }

    const result = streamText({
      model: gateway('openai/gpt-4o-mini'),
      system: VENUS_SYSTEM_PROMPT + identityLine,
      messages: await convertToModelMessages(messages),
    })

    try {
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
    const message = err instanceof Error ? err.message : 'Venus chat failed'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
