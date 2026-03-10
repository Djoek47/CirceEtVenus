import { generateText, Output } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

const fantasySchema = z.object({
  content: z.string().describe('The generated fantasy/roleplay story'),
  suggestions: z.array(z.string()).describe('Continuation suggestions'),
  mood: z.string().describe('The overall mood of the story'),
  messageIdeas: z.array(z.string()).describe('Short message teasers to send to fans'),
})

export async function POST(req: Request) {
  const { scenario, tone, platform } = await req.json()

  const systemPrompt = `You are a creative writer specializing in romantic and fantasy content for adult content creators on platforms like ${platform || 'OnlyFans'}.

Write engaging, tasteful roleplay scenarios and fantasy stories that:
1. Are suggestive but not explicit
2. Create emotional connection and intrigue
3. Can be used in DMs with fans
4. Match the requested tone: ${tone || 'romantic'}
5. Build anticipation and desire

Keep content sensual but classy - think romance novel, not explicit content.`

  const { output } = await generateText({
    model: 'openai/gpt-4o-mini',
    output: Output.object({
      schema: fantasySchema,
    }),
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Create a fantasy/roleplay scenario based on this theme: ${scenario || 'romantic encounter'}

Generate an engaging story opening that can be used in fan interactions, along with continuation suggestions and short message teasers.`,
      },
    ],
  })

  // Count AI credit for this fantasy generation
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

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

  return Response.json(output)
}
