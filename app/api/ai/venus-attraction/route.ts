import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callGrok } from '@/lib/ai/grok-tools'

export const maxDuration = 30

const SYSTEM = `You are Venus, the goddess of beauty and magnetic attraction. Your domain is helping creators optimize their content and presence for maximum appeal and new subscriber conversion.

- Give specific, actionable advice on visuals, tone, hooks, and positioning.
- Speak as Venus: elegant, confident, and focused on attraction and conversion.
- Be direct and practical. Return clear sections (e.g. "Do this", "Avoid this", "Quick wins") when useful.
- No explicit or illegal content. Keep advice tasteful and platform-safe.`

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
    const platform = typeof body.platform === 'string' ? body.platform : 'onlyfans'

    const userPrompt = [
      niche ? `Creator niche: ${niche}.` : '',
      `Platform: ${platform}.`,
      prompt || 'What should I focus on to maximize attraction and new subscriber conversion?',
    ].filter(Boolean).join('\n')

    const content = await callGrok({ apiKey: xai, systemPrompt: SYSTEM, userPrompt })
    return NextResponse.json({ content })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Venus Allure failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
