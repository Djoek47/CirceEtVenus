/**
 * Shared helper for Pro tools that use Grok (xAI).
 * Requires XAI_API_KEY. Used by Venus Pro and Circe Pro tools.
 */

const GROK_MODEL = 'grok-4-1-fast-reasoning'

export async function callGrok(opts: {
  apiKey: string
  systemPrompt: string
  userPrompt: string
  jsonMode?: boolean
}): Promise<string> {
  const { apiKey, systemPrompt, userPrompt, jsonMode } = opts

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROK_MODEL,
      temperature: 0.6,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Grok error (${res.status}): ${text.slice(0, 200)}`)
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = data?.choices?.[0]?.message?.content
  if (content == null || typeof content !== 'string') {
    throw new Error('Grok returned no content')
  }
  return content
}
