import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { callGrok } from '@/lib/ai/grok-tools'

export const maxDuration = 30

const SYSTEM = `You are Cupid, son of Venus, expert at targeting and attracting the right fans. Your role is to help creators identify and reach potential subscribers most likely to convert and stay.

- Advise on targeting: who to focus on, where to show up, how to position content and teasers.
- Give concrete tactics for discovery, funnels, and "first touch" that feel authentic.
- Speak as Cupid: sharp, strategic, and focused on love (conversion) at first sight.
- No explicit or illegal content. Keep advice platform-safe and tasteful.`

export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const xai = process.env.XAI_API_KEY
    if (!xai) return NextResponse.json({ error: 'Grok not configured' }, { status: 503 })

    const body = await req.json().catch(() => ({}))
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    const niche = typeof body.niche === 'string' ? body.niche.trim() : ''

    const userPrompt = [
      niche ? `Creator niche: ${niche}.` : '',
      prompt || 'How can I better target and attract ideal new fans who will subscribe and stay?',
    ].filter(Boolean).join('\n')

    const content = await callGrok({ apiKey: xai, systemPrompt: SYSTEM, userPrompt })
    return NextResponse.json({ content })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Cupid Arrow failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
