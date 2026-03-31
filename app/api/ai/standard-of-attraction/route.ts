import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { z } from 'zod'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { callGrok, callGrokVision } from '@/lib/ai/grok-tools'

export const maxDuration = 60

const outputSchema = z.object({
  score: z.number().min(1).max(10).describe('Overall commercial attractiveness 1-10'),
  verdict: z.string().describe('One-line verdict from Venus and Circe'),
  venusTake: z.string().describe('Venus perspective: appeal and magnetism'),
  circeTake: z.string().describe('Circe perspective: retention and enchantment'),
  strengths: z.array(z.string()).describe('What will sell'),
  improvements: z.array(z.string()).describe('Concrete tips to boost commercial appeal'),
})

type AttractionResult = z.infer<typeof outputSchema>

const GROK_SYSTEM = (niche: string, platform: string) =>
  `You are Venus and Circe in one panel, rating creator content for commercial attractiveness and market standards.

Venus (goddess of beauty and attraction): judges how magnetic, appealing, and likely to attract new subscribers and tips the content is. She cares about visual appeal, vibe, and "will this make fans fall in love?" Is this creator attractive enough to compete in the market?

Circe (enchantress of retention): judges how likely the content is to keep existing subscribers engaged and paying. She cares about uniqueness, storytelling, and "will this keep them under the spell?"

Respond with valid JSON only, no markdown or extra text. Use exactly these keys: score (number 1-10), verdict (string), venusTake (string), circeTake (string), strengths (array of strings), improvements (array of strings).
Niche: ${niche || 'general'}. Platform: ${platform}. Score 1-10 (10 = clearly up to market standards and will sell and retain).`

function parseGrokAttractionJson(raw: string): AttractionResult {
  const parsed = JSON.parse(raw) as Record<string, unknown>
  const score = typeof parsed.score === 'number' ? parsed.score : Number(parsed.score) || 5
  return {
    score: Math.min(10, Math.max(1, score)),
    verdict: typeof parsed.verdict === 'string' ? parsed.verdict : String(parsed.verdict ?? 'Rated.'),
    venusTake: typeof parsed.venusTake === 'string' ? parsed.venusTake : String(parsed.venusTake ?? ''),
    circeTake: typeof parsed.circeTake === 'string' ? parsed.circeTake : String(parsed.circeTake ?? ''),
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.filter((s): s is string => typeof s === 'string') : [],
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements.filter((s): s is string => typeof s === 'string') : [],
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const imageDataUrl = typeof body.image === 'string' ? body.image.trim() : ''
    const niche = typeof body.niche === 'string' ? body.niche.trim() : ''
    const platform = typeof body.platform === 'string' ? body.platform : 'onlyfans'

    if (!imageDataUrl && !description) {
      return NextResponse.json(
        { error: 'Upload a photo or describe your content to get a rating.' },
        { status: 400 }
      )
    }

    const xaiKey = process.env.XAI_API_KEY
    const systemPrompt = GROK_SYSTEM(niche, platform)

    if (imageDataUrl && imageDataUrl.startsWith('data:image/') && xaiKey) {
      const userPrompt = description
        ? `Rate this photo for commercial attractiveness and whether the creator is up to market standards. Optional context: ${description}`
        : 'Rate this photo for commercial attractiveness. Is this creator attractive enough and up to market standards for their niche? Give a combined Venus and Circe verdict.'
      const raw = await callGrokVision({
        apiKey: xaiKey,
        systemPrompt,
        userPrompt,
        imageDataUrl,
        jsonMode: true,
      })
      const object = parseGrokAttractionJson(raw)
      return NextResponse.json(object)
    }

    if (xaiKey && description) {
      const userPrompt = `Rate this content for commercial attractiveness and market standards:\n\n${description}`
      const raw = await callGrok({
        apiKey: xaiKey,
        systemPrompt,
        userPrompt,
        jsonMode: true,
      })
      const object = parseGrokAttractionJson(raw)
      return NextResponse.json(object)
    }

    if (!description) {
      return NextResponse.json(
        { error: 'Grok is not configured. Add XAI_API_KEY, or describe your content in text to use OpenAI.' },
        { status: 503 }
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
