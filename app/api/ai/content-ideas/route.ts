import { generateText, Output } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

const contentIdeasSchema = z.object({
  ideas: z.array(z.object({
    title: z.string().describe('Content idea title'),
    description: z.string().describe('Detailed description of the content idea'),
    type: z.enum(['photo', 'video', 'photoset', 'livestream', 'story', 'custom']).describe('Type of content'),
    estimatedEngagement: z.enum(['high', 'medium', 'low']).describe('Expected engagement level'),
    bestTimeToPost: z.string().describe('Recommended posting time'),
    hashtags: z.array(z.string()).describe('Relevant hashtags'),
  })).describe('List of content ideas'),
  trendingTopics: z.array(z.string()).describe('Current trending topics in the niche'),
  seasonalOpportunities: z.array(z.string()).describe('Upcoming seasonal content opportunities'),
  content: z.string().describe('Summary of the content strategy'),
  suggestions: z.array(z.string()).describe('Additional tips'),
})

export async function POST(req: Request) {
  const { niche, platform, currentTrends } = await req.json()

  const systemPrompt = `You are a content strategist for adult content creators on platforms like ${platform || 'OnlyFans'}.

Generate creative, engaging content ideas that:
1. Are trending and timely
2. Match the creator's niche: ${niche || 'general'}
3. Maximize engagement and revenue
4. Are diverse in content type
5. Include seasonal opportunities

Focus on tasteful, high-quality content ideas that build audience and drive subscriptions.`

  const { output } = await generateText({
    model: 'openai/gpt-4o-mini',
    output: Output.object({
      schema: contentIdeasSchema,
    }),
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Generate 5 unique content ideas for a ${niche || 'general'} creator on ${platform || 'OnlyFans'}.
        
${currentTrends ? `Consider these trends: ${currentTrends}` : 'Consider current social media trends.'}

Include a mix of content types and engagement levels.`,
      },
    ],
  })

  // Count AI credit for this content ideas run
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
