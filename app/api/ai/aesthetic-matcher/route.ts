import { generateText, Output } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

const aestheticSchema = z.object({
  content: z.string().describe('Aesthetic analysis summary'),
  currentStyle: z.string().describe('Analysis of current aesthetic'),
  trendingStyles: z.array(z.object({
    name: z.string().describe('Style name'),
    description: z.string().describe('Style description'),
    compatibility: z.number().min(0).max(100).describe('Compatibility with creator brand'),
    examples: z.array(z.string()).describe('Example content ideas'),
  })).describe('Trending aesthetic styles'),
  suggestions: z.array(z.string()).describe('Improvement suggestions'),
  colorPalette: z.array(z.string()).describe('Recommended color palette'),
  moodKeywords: z.array(z.string()).describe('Keywords that define the aesthetic'),
  editingTips: z.array(z.string()).describe('Photo/video editing tips'),
})

export async function POST(req: Request) {
  const { currentAesthetic, platform } = await req.json()

  const systemPrompt = `You are a visual aesthetics expert for content creators on adult platforms.

Analyze and recommend aesthetic styles that:
1. Align with current trends
2. Stand out from competitors
3. Create a cohesive brand
4. Appeal to target audiences
5. Are achievable with standard equipment

Focus on lighting, color grading, props, settings, and overall vibe.`

  const { output } = await generateText({
    model: 'openai/gpt-4o-mini',
    output: Output.object({
      schema: aestheticSchema,
    }),
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Analyze and improve this creator's aesthetic:

Current style: ${currentAesthetic || 'Not specified'}
Platform: ${platform || 'OnlyFans'}

Provide trending style recommendations and practical improvement tips.`,
      },
    ],
  })

  // Count AI credit for this aesthetic analysis
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
