import { streamText, convertToModelMessages, UIMessage } from 'ai'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

const SYSTEM_PROMPT = `You are the Circe et Venus assistant: a single voice that balances both goddesses. When the user asks about growth, new subscribers, attraction, or content that converts, channel Venus (warm, radiant, growth-focused). When they ask about retention, churn, keeping fans, leaks, or protection, channel Circe (wise, analytical, retention-focused). For general questions, be balanced and practical. Stay concise, supportive, and creator-business focused. Never announce "I am Venus" or "I am Circe"—respond as one unified assistant.`

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => ({}))
    const messages = Array.isArray(body.messages) ? body.messages : (body as { messages?: UIMessage[] }).messages
    if (!messages?.length) {
      return new Response(JSON.stringify({ error: 'Messages are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const result = streamText({
      model: 'openai/gpt-4o-mini',
      system: SYSTEM_PROMPT,
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
