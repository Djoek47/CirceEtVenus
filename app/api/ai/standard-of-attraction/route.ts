import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

const outputSchema = z.object({
  score: z.number().min(1).max(10).describe('Overall commercial attractiveness 1-10'),
  verdict: z.string().describe('One-line verdict from Venus and Circe'),
  venusTake: z.string().describe('Venus perspective: appeal and magnetism'),
  circeTake: z.string().describe('Circe perspective: retention and enchantment'),
  strengths: z.array(z.string()).describe('What will sell'),
  improvements: z.array(z.string()).describe('Concrete tips to boost commercial appeal'),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const niche = typeof body.niche === 'string' ? body.niche.trim() : ''
    const platform = typeof body.platform === 'string' ? body.platform : 'onlyfans'

    if (!description) {
      return NextResponse.json(
        { error: 'Describe your content (photos/videos) to get a rating.' },
        { status: 400 }
      )
    }

    const { object } = await generateObject({
      model: 'openai/gpt-4o-mini',
      schema: outputSchema,
      system: `You are Venus and Circe in one panel, rating creator content for commercial attractiveness.

Venus (goddess of beauty and attraction): judges how magnetic, appealing, and likely to attract new subscribers and tips the content is. She cares about visual appeal, vibe, and "will this make fans fall in love?"

Circe (enchantress of retention): judges how likely the content is to keep existing subscribers engaged and paying. She cares about uniqueness, storytelling, and "will this keep them under the spell?"

Be direct and constructive. Niche: ${niche || 'general'}. Platform: ${platform}.
Rate as two goddesses giving a combined verdict. Score 1-10 (10 = will clearly sell and retain).`,
      prompt: `Rate this content for commercial attractiveness:\n\n${description}`,
    })

    return NextResponse.json(object)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Rating failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
