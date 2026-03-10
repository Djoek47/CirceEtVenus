import { generateText, Output } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

const captionSchema = z.object({
  captions: z.array(z.object({
    text: z.string().describe('The caption text'),
    tone: z.enum(['teasing', 'playful', 'mysterious', 'confident', 'intimate']).describe('Caption tone'),
    length: z.enum(['short', 'medium', 'long']).describe('Caption length'),
  })),
  hashtags: z.array(z.string()).describe('Relevant hashtags'),
  teaserMessage: z.string().describe('Message to tease this content to fans'),
  ppvSalesCopy: z.string().describe('Sales copy for PPV unlock message'),
  bestPostingTime: z.string().describe('Recommended time to post'),
  targetAudience: z.string().describe('Who this content appeals to'),
  contentTips: z.array(z.string()).describe('Tips to maximize engagement'),
})

export async function POST(req: Request) {
  const { contentType, contentDescription, platform, creatorNiche, creatorTone } = await req.json()

  const systemPrompt = `You are a social media expert specializing in adult content creator platforms (OnlyFans, MYM, Fansly).

Creator Profile:
- Niche: ${creatorNiche || 'General'}
- Preferred Tone: ${creatorTone || 'Flirty and engaging'}
- Platform: ${platform || 'OnlyFans'}

Generate captivating captions, hashtags, and sales copy that:
1. Maximize engagement and clicks
2. Create urgency and FOMO
3. Maintain the creator's authentic voice
4. Drive PPV sales and tips
5. Follow platform guidelines (no explicit language)

Keep suggestions tasteful but enticing - suggestive without being explicit.`

  const { output } = await generateText({
    model: 'openai/gpt-4o-mini',
    output: Output.object({
      schema: captionSchema,
    }),
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Generate captions and sales copy for this content:

Content Type: ${contentType || 'Photo'}
Description: ${contentDescription || 'New content'}

Generate 3 caption variations, hashtags, teaser message, and PPV sales copy.`,
      },
    ],
  })

  // Best-effort AI credit accounting (no hard failure if this breaks)
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
