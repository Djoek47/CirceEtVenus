import { generateText, Output } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

const moodSchema = z.object({
  content: z.string().describe('Analysis summary'),
  mood: z.enum(['excited', 'interested', 'neutral', 'hesitant', 'frustrated', 'flirty', 'lonely', 'generous']).describe('Primary detected mood'),
  confidence: z.number().min(0).max(100).describe('Confidence in mood detection'),
  buyingSignals: z.array(z.string()).describe('Detected buying signals'),
  suggestedResponses: z.array(z.object({
    response: z.string().describe('Suggested response'),
    tone: z.string().describe('Tone of the response'),
  })).describe('Suggested responses based on mood'),
  suggestions: z.array(z.string()).describe('Tips for engaging with this fan'),
  upsellOpportunity: z.number().min(0).max(100).describe('Likelihood of successful upsell'),
})

export async function POST(req: Request) {
  const { message } = await req.json()

  const systemPrompt = `You are an expert at analyzing fan messages for content creators on adult platforms.

Analyze the emotional state of the fan based on their message and:
1. Detect their primary mood
2. Identify any buying signals or upsell opportunities
3. Suggest appropriate responses
4. Provide engagement tips

Be accurate and helpful - this analysis helps creators connect better with their fans.`

  const { output } = await generateText({
    model: 'openai/gpt-4o-mini',
    output: Output.object({
      schema: moodSchema,
    }),
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Analyze this fan message and detect their emotional state:

"${message || 'Hello!'}"

Provide mood analysis, buying signals, and suggested responses.`,
      },
    ],
  })

  // Count AI credit for this mood analysis
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
