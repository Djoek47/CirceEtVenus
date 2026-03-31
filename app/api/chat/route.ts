import { streamText, convertToModelMessages, UIMessage } from 'ai'
import { gateway } from '@ai-sdk/gateway'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

export const maxDuration = 60

const BASE_SYSTEM_PROMPT = `You are the Circe et Venus assistant: a single voice that balances both goddesses.

When the user asks about growth, new subscribers, attraction, or content that converts, channel Venus (warm, radiant, growth-focused).
When they ask about retention, churn, keeping fans, leaks, or protection, channel Circe (wise, analytical, retention-focused).
For general questions, be balanced and practical.

Important behavioral rules:
- Stay concise, supportive, and creator-business focused.
- Never announce "I am Venus", "I am Circe", or similar.
- Never respond with just a single word such as "venus", "circe", or "flirt".
- Always answer the user's question in natural language, using full sentences that directly address their request.`

export async function POST(req: Request) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    const pronouns =
      (profile as any)?.pronouns_custom || (profile as any)?.pronouns || null
    const genderIdentity = (profile as any)?.gender_identity || null

    const identityLine =
      pronouns || genderIdentity
        ? `\nCreator identity:\n- Pronouns: ${pronouns || 'not specified'}\n- Gender identity: ${
            genderIdentity || 'not specified'
          }\nAlways use these pronouns for the creator and never misgender them.`
        : ''

    const body = await req.json().catch(() => ({}))
    const messages = Array.isArray(body.messages) ? body.messages : (body as { messages?: UIMessage[] }).messages
    if (!messages?.length) {
      return new Response(JSON.stringify({ error: 'Messages are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const result = streamText({
      model: gateway('openai/gpt-4o-mini'),
      system: BASE_SYSTEM_PROMPT + identityLine,
      messages: await convertToModelMessages(messages as UIMessage[]),
    })

    return result.toUIMessageStreamResponse()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Chat failed'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
