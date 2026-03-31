import { NextRequest } from 'next/server'
import { generateText, Output } from 'ai'
import { z } from 'zod'

export const maxDuration = 30

const fanPredictionSchema = z.object({
  valueScore: z.number().min(0).max(100).describe('Overall fan value score 0-100'),
  ppvPurchaseProbability: z.number().min(0).max(100).describe('Likelihood to purchase PPV content'),
  churnRisk: z.enum(['low', 'medium', 'high']).describe('Risk of fan unsubscribing'),
  lifetimeValueEstimate: z.number().describe('Estimated lifetime value in dollars'),
  suggestedTier: z.enum(['whale', 'vip', 'regular', 'casual', 'at-risk']).describe('Suggested fan tier'),
  engagementStrategy: z.object({
    priority: z.enum(['high', 'medium', 'low']).describe('How much attention this fan should get'),
    approach: z.string().describe('Recommended engagement approach'),
    contentTypes: z.array(z.string()).describe('Types of content this fan responds to'),
    bestTimeToMessage: z.string().describe('Best time of day to message'),
    upsellRecommendation: z.string().describe('Specific upsell recommendation'),
  }),
  insights: z.array(z.string()).describe('Key insights about this fan'),
})

export async function POST(req: NextRequest) {
  const { fanData } = await req.json()

  const systemPrompt = `You are an AI analyst for a creator management platform. Analyze fan data to predict their value and recommend engagement strategies.

Analyze the following metrics:
- Message frequency and response patterns
- Tipping and spending history
- Subscription duration and renewal patterns
- Content interaction patterns
- Response time and engagement quality

Provide actionable insights to help creators maximize revenue while maintaining authentic relationships.`

  const { output } = await generateText({
    model: 'openai/gpt-4o-mini',
    output: Output.object({
      schema: fanPredictionSchema,
    }),
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Analyze this fan's data and predict their value:

Fan Data:
- Username: ${fanData.username}
- Subscription Age: ${fanData.subscriptionAge || 'Unknown'} days
- Total Spent: $${fanData.totalSpent || 0}
- Messages Sent: ${fanData.messageCount || 0}
- Tips Given: ${fanData.tipCount || 0} (Total: $${fanData.tipTotal || 0})
- PPV Purchases: ${fanData.ppvCount || 0} (Total: $${fanData.ppvTotal || 0})
- Last Active: ${fanData.lastActive || 'Unknown'}
- Average Response Time: ${fanData.avgResponseTime || 'Unknown'}
- Renewal Rate: ${fanData.renewalRate || 'Unknown'}%
- Platform: ${fanData.platform || 'Unknown'}

Generate predictions and engagement recommendations.`,
      },
    ],
  })

  return Response.json(output)
}
