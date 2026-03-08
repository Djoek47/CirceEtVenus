import { generateText, Output } from 'ai'
import { z } from 'zod'

export const maxDuration = 30

const suggestionSchema = z.object({
  suggestions: z.array(z.object({
    text: z.string().describe('The suggested reply message'),
    tone: z.enum(['flirty', 'casual', 'professional', 'playful', 'seductive']).describe('The tone of the message'),
    hasUpsell: z.boolean().describe('Whether this suggestion includes an upsell opportunity'),
    upsellType: z.enum(['ppv', 'tip', 'subscription', 'custom', 'none']).nullable().describe('Type of upsell if any'),
  })),
  fanSentiment: z.enum(['interested', 'neutral', 'cold', 'excited', 'frustrated']).describe('Detected fan sentiment'),
  upsellOpportunity: z.number().min(0).max(100).describe('Score 0-100 indicating how good of an upsell opportunity this is'),
  recommendedAction: z.string().describe('Brief recommendation on how to handle this conversation'),
})

export async function POST(req: Request) {
  const { fanMessage, conversationHistory, fanTier, creatorPersona } = await req.json()

  const systemPrompt = `You are an AI assistant helping content creators on platforms like OnlyFans, MYM, and Fansly craft engaging replies to their fans.

Creator Persona: ${creatorPersona || 'Friendly, flirty, and engaging'}
Fan Tier: ${fanTier || 'regular'}

Your job is to:
1. Analyze the fan's message and conversation history
2. Generate 3 reply suggestions with different tones
3. Identify upsell opportunities (PPV content, tips, custom requests)
4. Detect fan sentiment and buying signals
5. Recommend the best approach

Focus on maximizing engagement and revenue while maintaining authentic, personal interactions.
Never be explicit or inappropriate - keep suggestions tasteful but enticing.`

  const { output } = await generateText({
    model: 'openai/gpt-4o-mini',
    output: Output.object({
      schema: suggestionSchema,
    }),
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Fan message: "${fanMessage}"

Previous conversation:
${conversationHistory || 'No previous messages'}

Generate reply suggestions and analyze this interaction.`,
      },
    ],
  })

  return Response.json(output)
}
