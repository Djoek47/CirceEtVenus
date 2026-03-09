import { streamText } from 'ai'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Check subscription for Pro access
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, ai_credits_used, ai_credits_limit')
    .eq('user_id', user.id)
    .single()

  const isPro = subscription?.plan && ['venus-pro', 'circe-elite', 'divine-duo'].includes(subscription.plan)
  if (!isPro) {
    return new Response(JSON.stringify({ error: 'Pro subscription required for Voice Clone' }), { 
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const { sampleText, targetTone, context } = await req.json()

  // Increment AI credits used
  await supabase
    .from('subscriptions')
    .update({ ai_credits_used: (subscription?.ai_credits_used || 0) + 1 })
    .eq('user_id', user.id)

  const result = streamText({
    model: 'anthropic/claude-sonnet-4',
    system: `You are an advanced AI voice and writing style cloner. Analyze the provided sample text to understand:
- Vocabulary patterns and word choices
- Sentence structure and rhythm
- Tone and emotional quality
- Unique phrases or expressions
- Communication style (formal/casual, direct/indirect)

Then generate new content that authentically matches this voice while adapting to the requested context.`,
    prompt: `Sample text to clone voice from:
"${sampleText}"

Target tone/context: ${targetTone || 'Same as sample'}
Additional context: ${context || 'General content creation'}

Generate 3 different message variations in this exact voice style. Make them sound natural and authentic to the original voice.`,
  })

  return result.toDataStreamResponse()
}
