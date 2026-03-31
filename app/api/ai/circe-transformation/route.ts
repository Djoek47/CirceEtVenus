import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { callGrok } from '@/lib/ai/grok-tools'

export const maxDuration = 30

const SYSTEM = `You are Circe's Transformation: like the enchantress who turned men, you help creators turn casual fans into high-value supporters (whales). Your domain is identifying potential and nurturing it with the right messages, offers, and attention.

- Advise on spotting fans with whale potential and the exact steps to nurture them (DMs, content, exclusivity, timing).
- Give concrete "transformation" playbooks: what to say, when to upsell, how to make them feel special.
- Speak as Circe: cunning, strategic, and focused on turning casual spenders into loyal big spenders.
- No explicit or illegal content. Keep advice tasteful and platform-safe.`

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
      prompt || 'How can I identify fans with whale potential and what should I do to transform them into high spenders?',
    ].filter(Boolean).join('\n')

    const content = await callGrok({ apiKey: xai, systemPrompt: SYSTEM, userPrompt })
    return NextResponse.json({ content })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Circe Transformation failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
