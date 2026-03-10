import { generateText, Output } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

const revenueOptimizationSchema = z.object({
  ppvPricing: z.object({
    recommendedPrice: z.number().describe('Recommended PPV price'),
    priceRange: z.object({
      min: z.number(),
      max: z.number(),
    }),
    reasoning: z.string().describe('Why this price is recommended'),
    estimatedConversionRate: z.number().describe('Expected conversion rate percentage'),
    projectedRevenue: z.number().describe('Projected revenue from this price'),
  }),
  postingStrategy: z.object({
    bestDays: z.array(z.string()).describe('Best days to post'),
    bestTimes: z.array(z.string()).describe('Best times to post'),
    postingFrequency: z.string().describe('Recommended posting frequency'),
    reasoning: z.string().describe('Why these times/days work best'),
  }),
  audienceTargeting: z.object({
    topFansToTarget: z.array(z.string()).describe('Types of fans to prioritize'),
    massMessageTiming: z.string().describe('Best time to send mass messages'),
    personalMessageTargets: z.string().describe('Which fans to message personally'),
  }),
  revenueProjection: z.object({
    currentMonthlyEstimate: z.number(),
    optimizedMonthlyEstimate: z.number(),
    percentageIncrease: z.number(),
    keyActions: z.array(z.string()).describe('Key actions to reach optimized revenue'),
  }),
  contentRecommendations: z.array(z.object({
    type: z.string().describe('Type of content'),
    expectedEngagement: z.enum(['high', 'medium', 'low']),
    reasoning: z.string(),
  })),
})

export async function POST(req: Request) {
  const { creatorStats, contentHistory, fanDemographics, currentPricing } = await req.json()

  const systemPrompt = `You are a revenue optimization AI for adult content creators on OnlyFans, MYM, and Fansly.

Your job is to analyze creator data and provide actionable recommendations to maximize revenue while maintaining fan satisfaction.

Consider:
1. Platform-specific best practices
2. Content performance patterns
3. Fan engagement and spending behavior
4. Pricing psychology
5. Timing and frequency optimization
6. Audience segmentation

Provide specific, data-driven recommendations.`

  const { output } = await generateText({
    model: 'openai/gpt-4o-mini',
    output: Output.object({
      schema: revenueOptimizationSchema,
    }),
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Analyze this creator's data and optimize their revenue strategy:

Creator Stats:
- Monthly Revenue: $${creatorStats?.monthlyRevenue || 5000}
- Subscriber Count: ${creatorStats?.subscriberCount || 200}
- Average PPV Price: $${creatorStats?.avgPpvPrice || 15}
- PPV Conversion Rate: ${creatorStats?.ppvConversionRate || 8}%
- Engagement Rate: ${creatorStats?.engagementRate || 25}%
- Platform: ${creatorStats?.platform || 'OnlyFans'}

Content Performance:
- Top Content Type: ${contentHistory?.topType || 'Photos'}
- Average Likes: ${contentHistory?.avgLikes || 50}
- Best Performing Day: ${contentHistory?.bestDay || 'Unknown'}
- Best Performing Time: ${contentHistory?.bestTime || 'Unknown'}

Current Pricing:
- Subscription Price: $${currentPricing?.subscription || 10}
- Average PPV: $${currentPricing?.ppv || 15}
- Custom Content Rate: $${currentPricing?.custom || 50}

Fan Demographics:
- Whale Percentage: ${fanDemographics?.whalePercent || 5}%
- Active Fans: ${fanDemographics?.activePercent || 40}%
- Average Fan Age: ${fanDemographics?.avgAge || 'Unknown'}

Generate comprehensive revenue optimization recommendations.`,
      },
    ],
  })

  // Count AI credit for this revenue optimization analysis
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
