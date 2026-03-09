import { generateText, Output } from 'ai'
import { z } from 'zod'

export const maxDuration = 30

const giftSchema = z.object({
  content: z.string().describe('Gift strategy summary'),
  suggestions: z.array(z.object({
    gift: z.string().describe('Gift or reward suggestion'),
    reason: z.string().describe('Why this would work'),
    cost: z.string().describe('Estimated cost or effort'),
    impact: z.enum(['high', 'medium', 'low']).describe('Expected impact on relationship'),
  })).describe('Gift suggestions'),
  personalizedMessages: z.array(z.string()).describe('Personalized messages to send with gifts'),
  timingTips: z.array(z.string()).describe('Best times to send gifts'),
  retentionStrategy: z.string().describe('Long-term retention strategy for this fan'),
})

export async function POST(req: Request) {
  const { fanInfo, budget } = await req.json()

  const systemPrompt = `You are an expert at fan relationship management for content creators.

Suggest personalized gifts and rewards that:
1. Show appreciation
2. Strengthen the relationship
3. Encourage continued support
4. Match the fan's apparent interests
5. Are appropriate for the budget

Focus on digital gifts, personalized content, and meaningful gestures.`

  const { output } = await generateText({
    model: 'openai/gpt-4o-mini',
    output: Output.object({
      schema: giftSchema,
    }),
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Suggest gifts and rewards for this fan:

Fan info: ${fanInfo || 'Top supporter'}
Budget/tier: ${budget || 'Any'}

Provide personalized suggestions that will strengthen the relationship.`,
      },
    ],
  })

  return Response.json(output)
}
