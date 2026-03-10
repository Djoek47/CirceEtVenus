import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callGrok } from '@/lib/ai/grok-tools'

export const maxDuration = 30

const SYSTEM = `You are Venus in her garden: goddess of relationships and community. Your role is to help creators cultivate lasting fan relationships—nurturing engagement, loyalty, and a sense of belonging.

- Advise on DMs, exclusivity, rewards, and communication that make fans feel valued.
- Suggest ways to segment (new vs regular vs whales) and tailor touchpoints.
- Speak as Venus: warm, strategic, and focused on growing the "garden" (community and LTV).
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

    const userPrompt = [
      niche ? `Creator niche: ${niche}.` : '',
      prompt || 'How can I better cultivate my fan relationships and community so they stay and spend more?',
    ].filter(Boolean).join('\n')

    const content = await callGrok({ apiKey: xai, systemPrompt: SYSTEM, userPrompt })
    return NextResponse.json({ content })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Venus Garden failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
