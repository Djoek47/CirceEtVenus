import { NextRequest } from 'next/server'
import { streamText } from 'ai'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

export async function POST(req: NextRequest) {
  const supabase = await createRouteHandlerClient(req)
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Check subscription for Pro access
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_id, ai_credits_used, ai_credits_limit')
    .eq('user_id', user.id)
    .single()

  const planId = (subscription as any)?.plan_id as string | null | undefined
  const normalizedPlanId = planId?.toLowerCase() || null
  const isPro = Boolean(normalizedPlanId && ['venus-pro', 'circe-elite', 'divine-duo'].includes(normalizedPlanId))
  if (!isPro) {
    return new Response(JSON.stringify({ error: 'Pro subscription required for Mass DM Composer' }), { 
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const { campaign, audienceSegment, tone, callToAction, personalizationFields } = await req.json()

  // Increment AI credits used
  await supabase
    .from('subscriptions')
    .update({ ai_credits_used: (subscription?.ai_credits_used || 0) + 1 })
    .eq('user_id', user.id)

  const result = streamText({
    model: 'anthropic/claude-sonnet-4',
    system: `You are an expert in crafting personalized mass messages for content creators. You create messages that feel personal and genuine while being efficient to send at scale. You understand platform best practices and avoid spam triggers.`,
    prompt: `Create a mass DM campaign:
- Campaign Goal: ${campaign || 'General engagement'}
- Audience Segment: ${audienceSegment || 'All subscribers'}
- Desired Tone: ${tone || 'Friendly and personal'}
- Call to Action: ${callToAction || 'Engage with content'}
- Personalization Fields: ${personalizationFields || '{name}, {tier}'}

Generate:
1. Main message template with personalization placeholders
2. 3 subject line variations (if applicable)
3. 2 alternative message versions for A/B testing
4. Follow-up message for non-responders
5. Optimal send time recommendations
6. Expected response rate estimate
7. Tips for maximizing engagement

Use placeholders like {name}, {tier}, {last_purchase} that can be replaced with real data.`,
  })

  return result.toDataStreamResponse()
}
