/**
 * Divine Manager: run an AI Studio tool by id. Used so Divine (voice) can
 * analyze content, generate captions, predict viral, etc. without the user
 * opening other screens. User uploads a photo and talks; Divine calls this.
 * When analyzing a photo (standard-of-attraction + image), we use OpenAI vision
 * in-process to avoid 401 from internal fetch; same response shape as AI Studio.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

const VISION_MODEL = 'gpt-4o-mini'

type AttractionResult = {
  score: number
  verdict: string
  venusTake: string
  circeTake: string
  strengths: string[]
  improvements: string[]
}

function buildAttractionSystemPrompt(niche: string, platform: string): string {
  return `You are Venus and Circe in one panel, rating creator content for commercial attractiveness and market standards.

Venus (goddess of beauty and attraction): judges how magnetic, appealing, and likely to attract new subscribers and tips the content is. She cares about visual appeal, vibe, and "will this make fans fall in love?" Is this creator attractive enough to compete in the market?

Circe (enchantress of retention): judges how likely the content is to keep existing subscribers engaged and paying. She cares about uniqueness, storytelling, and "will this keep them under the spell?"

Respond with valid JSON only, no markdown or extra text. Use exactly these keys: score (number 1-10), verdict (string), venusTake (string), circeTake (string), strengths (array of strings), improvements (array of strings).
Niche: ${niche || 'general'}. Platform: ${platform}. Score 1-10 (10 = clearly up to market standards and will sell and retain).`
}

function parseAttractionJson(raw: string): AttractionResult {
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

async function runOpenAIVisionAttraction(
  apiKey: string,
  imageDataUrl: string,
  description: string,
  niche: string,
  platform: string
): Promise<AttractionResult> {
  const systemPrompt = buildAttractionSystemPrompt(niche, platform)
  const textPrompt = description
    ? `Rate this photo for commercial attractiveness and whether the creator is up to market standards. Optional context: ${description}`
    : 'Rate this photo for commercial attractiveness. Is this creator attractive enough and up to market standards for their niche? Give a combined Venus and Circe verdict. Respond with JSON only: score, verdict, venusTake, circeTake, strengths, improvements.'

  const userContent: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail?: string } }> = [
    { type: 'text', text: textPrompt },
    { type: 'image_url', image_url: { url: imageDataUrl, detail: imageDataUrl.length > 400_000 ? 'low' : 'high' } },
  ]

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      max_tokens: 600,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`OpenAI vision error (${res.status}): ${errText.slice(0, 200)}`)
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = data?.choices?.[0]?.message?.content
  if (content == null || typeof content !== 'string') {
    throw new Error('OpenAI returned no content')
  }
  return parseAttractionJson(content)
}

async function runOpenAITextAttraction(
  apiKey: string,
  description: string,
  niche: string,
  platform: string
): Promise<AttractionResult> {
  const systemPrompt = buildAttractionSystemPrompt(niche, platform)
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      max_tokens: 600,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Rate this content for commercial attractiveness and market standards:\n\n${description}` },
      ],
      response_format: { type: 'json_object' },
    }),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`OpenAI error (${res.status}): ${errText.slice(0, 200)}`)
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = data?.choices?.[0]?.message?.content
  if (content == null || typeof content !== 'string') {
    throw new Error('OpenAI returned no content')
  }
  return parseAttractionJson(content)
}

const ALLOWED_TOOL_IDS = [
  'standard-of-attraction',
  'caption-generator',
  'viral-predictor',
  'churn-predictor',
  'whale-whisperer',
  'content-ideas',
  'aesthetic-matcher',
  'mood-detector',
] as const

type AllowedToolId = (typeof ALLOWED_TOOL_IDS)[number]

function isAllowed(id: string): id is AllowedToolId {
  return (ALLOWED_TOOL_IDS as readonly string[]).includes(id)
}

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
    const toolId = typeof body.toolId === 'string' ? body.toolId.trim() : ''
    const params = typeof body.params === 'object' && body.params !== null ? body.params : {}

    if (!toolId || !isAllowed(toolId)) {
      return NextResponse.json(
        { error: 'Invalid or disallowed toolId. Allowed: ' + ALLOWED_TOOL_IDS.join(', ') },
        { status: 400 }
      )
    }

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const apiBase = baseUrl + '/api/ai'

    let res: Response
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Cookie: req.headers.get('cookie') || '',
    }

    switch (toolId) {
      case 'standard-of-attraction': {
        const imageUrl = typeof params.image === 'string' ? params.image.trim() : ''
        const niche = (params.niche as string) ?? ''
        const platform = (params.platform as string) ?? 'onlyfans'
        const description = (params.description as string) ?? ''
        const apiKey = process.env.OPENAI_API_KEY
        if (imageUrl && imageUrl.startsWith('data:image/')) {
          if (!apiKey) {
            return NextResponse.json({ error: 'OPENAI_API_KEY not set' }, { status: 503 })
          }
          try {
            const normalized = await runOpenAIVisionAttraction(apiKey, imageUrl, description, niche, platform)
            return NextResponse.json({ success: true, result: normalized })
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Vision analysis failed'
            console.error('[divine/run-ai-tool] vision', err)
            return NextResponse.json({ error: message }, { status: 502 })
          }
        }
        if (description && apiKey) {
          try {
            const normalized = await runOpenAITextAttraction(apiKey, description, niche, platform)
            return NextResponse.json({ success: true, result: normalized })
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Text rating failed'
            console.error('[divine/run-ai-tool] text attraction', err)
            return NextResponse.json({ error: message }, { status: 502 })
          }
        }
        const payload = {
          description: params.description ?? '',
          image: params.image ?? undefined,
          niche: params.niche ?? '',
          platform: params.platform ?? 'onlyfans',
        }
        res = await fetch(`${apiBase}/standard-of-attraction`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        })
        break
      }
      case 'caption-generator': {
        const payload = {
          contentType: params.contentType ?? 'photo',
          contentDescription: params.contentDescription ?? params.description ?? 'Content for my audience',
          platform: params.platform ?? 'onlyfans',
          creatorNiche: params.creatorNiche ?? params.niche,
          creatorTone: params.creatorTone,
        }
        res = await fetch(`${apiBase}/caption-generator`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        })
        break
      }
      case 'viral-predictor': {
        const payload = {
          contentDescription: params.contentDescription ?? params.description ?? 'New content',
          contentType: params.contentType ?? 'photo',
          platform: params.platform ?? 'onlyfans',
        }
        res = await fetch(`${apiBase}/viral-predictor`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        })
        break
      }
      case 'churn-predictor': {
        const prompt = [
          params.fanData && `Fan data: ${params.fanData}`,
          params.recentActivity && `Recent activity: ${params.recentActivity}`,
          params.subscriptionLength && `Subscription length: ${params.subscriptionLength}`,
          params.spendingHistory && `Spending history: ${params.spendingHistory}`,
        ]
          .filter(Boolean)
          .join('. ') || 'General subscriber churn risk analysis.'
        res = await fetch(`${apiBase}/tool-run`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ toolId: 'churn-predictor', prompt }),
        })
        break
      }
      case 'whale-whisperer': {
        const prompt =
          typeof params.context === 'string' && params.context.trim()
            ? params.context.trim()
            : 'How can I better engage and retain my highest-spending fans?'
        res = await fetch(`${apiBase}/tool-run`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ toolId: 'whale-whisperer', prompt }),
        })
        break
      }
      case 'content-ideas': {
        const payload = {
          niche: params.niche ?? '',
          platform: params.platform ?? 'onlyfans',
          currentTrends: params.currentTrends,
        }
        res = await fetch(`${apiBase}/content-ideas`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        })
        break
      }
      case 'aesthetic-matcher': {
        const payload = {
          currentAesthetic: params.currentAesthetic ?? params.description ?? '',
          platform: params.platform ?? 'onlyfans',
        }
        res = await fetch(`${apiBase}/aesthetic-matcher`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        })
        break
      }
      case 'mood-detector': {
        const payload = { message: params.message ?? params.text ?? '' }
        res = await fetch(`${apiBase}/mood-detector`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        })
        break
      }
      default:
        return NextResponse.json({ error: 'Unhandled tool' }, { status: 400 })
    }

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json(
        { error: (data as { error?: string }).error || 'Tool failed', details: data },
        { status: res.status }
      )
    }

    return NextResponse.json({ success: true, result: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'run-ai-tool failed'
    console.error('[divine/run-ai-tool]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
