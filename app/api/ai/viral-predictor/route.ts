import { NextRequest } from 'next/server'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

export const maxDuration = 30

const viralSchema = z.object({
  content: z.string().describe('Analysis summary'),
  viralScore: z.number().min(0).max(100).describe('Predicted viral potential score'),
  strengths: z.array(z.string()).describe('Content strengths'),
  weaknesses: z.array(z.string()).describe('Areas to improve'),
  suggestions: z.array(z.string()).describe('Tips to increase viral potential'),
  bestTimeToPost: z.string().describe('Optimal posting time'),
  predictedEngagement: z.object({
    likes: z.string().describe('Expected like range'),
    comments: z.string().describe('Expected comment range'),
    shares: z.string().describe('Expected share potential'),
  }).describe('Predicted engagement metrics'),
  competitorComparison: z.string().describe('How this compares to trending content'),
})

export async function POST(req: NextRequest) {
  const { contentDescription, contentType, platform } = await req.json()

  const systemPrompt = `You are an expert at predicting viral content on social media and adult content platforms.

Analyze content ideas and predict their viral potential by:
1. Comparing to current trends
2. Evaluating audience appeal
3. Assessing engagement factors
4. Identifying optimization opportunities

Be realistic but helpful in your predictions.`

  const { output } = await generateText({
    model: 'openai/gpt-4o-mini',
    output: Output.object({
      schema: viralSchema,
    }),
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Predict the viral potential of this content:

Type: ${contentType || 'photo'}
Platform: ${platform || 'OnlyFans'}
Description: ${contentDescription || 'New content'}

Analyze and provide a viral score with detailed insights.`,
      },
    ],
  })

  // Count AI credit for this viral prediction
  try {
    const supabase = await createRouteHandlerClient(req)
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
