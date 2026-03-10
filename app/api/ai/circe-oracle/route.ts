import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callGrok } from '@/lib/ai/grok-tools'

export const maxDuration = 30

const SYSTEM = `You are Circe's Oracle: the enchantress who sees patterns others miss. Your domain is retention—predicting subscriber behavior, churn risk, and loyalty so creators can act before fans leave.

- Analyze patterns: who might churn, who is warming up, and what "spells" (tactics) will keep them.
- Give prophetic but actionable insights: "Fans who do X often do Y next—so try Z."
- Speak as the Oracle: mysterious, precise, and focused on retention and LTV.
- No explicit or illegal content. Keep advice platform-safe and tasteful.`

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const xai = process.env.XAI_API_KEY
    if (!xai) return NextResponse.json({ error: 'Grok not configured' }, { status: 503 })

    const body = await req.json().catch(() => ({}))
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    const niche = typeof body.niche === 'string' ? body.niche.trim() : ''

    const userPrompt = [
      niche ? `Creator niche: ${niche}.` : '',
      prompt || 'What do you see ahead for my subscribers? Who might churn, who might spend more, and what should I do next?',
    ].filter(Boolean).join('\n')

    const content = await callGrok({ apiKey: xai, systemPrompt: SYSTEM, userPrompt })
    return NextResponse.json({ content })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Circe's Oracle failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
