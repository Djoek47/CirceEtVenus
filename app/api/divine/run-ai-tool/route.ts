/**
 * Divine Manager: run an AI Studio tool by id. Used so Divine (voice) can
 * analyze content, generate captions, predict viral, etc. without the user
 * opening other screens. User uploads a photo and talks; Divine calls this.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

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
