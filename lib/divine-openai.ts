/**
 * Divine Manager–only OpenAI calls using OPENAI_API_KEY (no AI gateway).
 * Uses the Chat Completions API directly so all Divine AI uses the same key.
 */

const MODEL = 'gpt-4o-mini'

type Message = { role: 'user' | 'assistant' | 'system'; content: string }

export type DivineOpenAIOptions = {
  system?: string
  prompt?: string
  messages?: Message[]
  maxTokens?: number
  temperature?: number
}

/**
 * Call OpenAI Chat Completions with OPENAI_API_KEY. Use for all Divine Manager text generation.
 */
export async function generateTextWithOpenAI(options: DivineOpenAIOptions): Promise<{ text: string }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set')
  }

  const messages: Message[] = []
  if (options.system) {
    messages.push({ role: 'system', content: options.system })
  }
  if (options.messages?.length) {
    messages.push(...options.messages)
  }
  if (options.prompt) {
    messages.push({ role: 'user', content: options.prompt })
  }
  if (messages.length === 0) {
    throw new Error('At least one of system, prompt, or messages is required')
  }

  const body: Record<string, unknown> = {
    model: MODEL,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    max_tokens: options.maxTokens ?? 1024,
  }
  if (options.temperature !== undefined) {
    body.temperature = options.temperature
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`OpenAI API error ${res.status}: ${errText}`)
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string }; text?: string }>
  }
  const content =
    data.choices?.[0]?.message?.content ?? data.choices?.[0]?.text ?? ''
  return { text: content }
}
