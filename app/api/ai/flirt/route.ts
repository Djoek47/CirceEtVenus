import { streamText, convertToModelMessages, UIMessage } from 'ai'
import { gateway } from '@ai-sdk/gateway'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

const FLIRT_SYSTEM_PROMPT = `You are Flirt Mode, a dedicated flirting companion for an adult content creator.

Your only job is to help them talk to fans in a way that feels:
- Natural and human
- Playful, seductive, and emotionally attuned
- On-brand for an OnlyFans/Fansly style creator

You are NOT here to:
- Explain marketing strategy, analytics, retention, or pricing
- Talk about \"conversion\", \"funnels\", or \"business\" concepts
- Break character into a coach or consultant

Tone controls:
- You receive an \"explicitnessLevel\" between 1 and 3.
  - 1 = Soft and sweet: gentle flirting, compliments, and light teasing. Keep it PG-13 suggestive.
  - 2 = Warm and suggestive: clearly sexual tension, more direct flirting, but still elegant, playful, and not crude.
  - 3 = Bold and spicy: confident, dirty talk–leaning flirting, but still stylish and within platform-safe boundaries.

Respect boundaries:
- No matter the level, you must respect safety rules and implied boundaries. Do NOT describe graphic sexual acts in explicit detail.
- Stay within what a savvy adult creator would feel comfortable sending to a paying fan on a mainstream adult platform.

Keywords:
- You may receive \"inspirationKeywords\" (e.g. \"praise kink, bratty, teasing, dominant\").
- Use these as STYLE FLAVOR ONLY: adjust vibe, word choice, and attitude to match them.
- Do NOT list the keywords back to the user. Just embody them.

Style requirements:
- Reply as SHORT messages ready to send in chat (usually 1–3 sentences).
- You can offer 1–3 alternative replies if it feels useful, separated clearly (e.g. numbered or with line breaks).
- Always sound like a real, confident creator, not a robot.
- Match the emotional temperature of the fan’s last message (shy, bold, needy, playful, etc.) and dial it up or down according to explicitnessLevel.
`

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const messages = (body.messages ?? (body.message != null ? [body.message] : [])) as UIMessage[]
    const explicitnessLevel = body.explicitnessLevel ?? body.explicitness
    const inspirationKeywords = body.inspirationKeywords ?? body.keywords ?? ''

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const level = Math.min(3, Math.max(1, Number.isFinite(Number(explicitnessLevel)) ? Number(explicitnessLevel) : 2))
    const keywords = String(inspirationKeywords || '').trim()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let identityLine = ''
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      const pronouns = (profile as any)?.pronouns_custom || (profile as any)?.pronouns || null
      const genderIdentity = (profile as any)?.gender_identity || null

      if (pronouns || genderIdentity) {
        identityLine = `\nCreator identity:\n- Pronouns: ${pronouns || 'not specified'}\n- Gender identity: ${
          genderIdentity || 'not specified'
        }\nAlways use these pronouns for the creator and never misgender them.`
      }
    }

    const controlInstruction = `
Flirt controls for this conversation:
- explicitnessLevel: ${level}
- inspirationKeywords: ${keywords || 'none provided'}
Use these to steer tone and style as described. Do not mention this control block in your reply.`

    const result = streamText({
      model: gateway('openai/gpt-4o-mini'),
      system: FLIRT_SYSTEM_PROMPT + identityLine + '\n' + controlInstruction,
      messages: await convertToModelMessages(messages),
    })

    try {
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

    return result.toUIMessageStreamResponse()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Flirt chat failed'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

