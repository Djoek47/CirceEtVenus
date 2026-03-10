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
    .select('plan_id, ai_credits_used, ai_credits_limit')
    .eq('user_id', user.id)
    .single()

  const planId = (subscription as any)?.plan_id as string | null | undefined
  const normalizedPlanId = planId?.toLowerCase() || null
  const isPro = Boolean(normalizedPlanId && ['venus-pro', 'circe-elite', 'divine-duo'].includes(normalizedPlanId))
  if (!isPro) {
    return new Response(JSON.stringify({ error: 'Pro subscription required for Pricing Optimizer' }), { 
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const { contentType, currentPrice, subscriberCount, engagementRate, niche } = await req.json()

  // Increment AI credits used
  await supabase
    .from('subscriptions')
    .update({ ai_credits_used: (subscription?.ai_credits_used || 0) + 1 })
    .eq('user_id', user.id)

  const result = streamText({
    model: 'anthropic/claude-sonnet-4',
    system: `You are an expert pricing strategist for content creators. You analyze market data, engagement metrics, and audience behavior to recommend optimal pricing strategies that maximize both revenue and subscriber satisfaction.`,
    prompt: `Analyze pricing for this creator:
- Content Type: ${contentType || 'Premium content'}
- Current Price: $${currentPrice || 'Not set'}
- Subscriber Count: ${subscriberCount || 'Unknown'}
- Engagement Rate: ${engagementRate || 'Unknown'}%
- Niche: ${niche || 'General'}

Provide:
1. Optimal price recommendation with reasoning
2. Tiered pricing strategy (if applicable)
3. PPV pricing suggestions
4. Bundle/discount opportunities
5. Seasonal pricing recommendations
6. A/B testing suggestions

Format as actionable recommendations with expected impact on revenue.`,
  })

  return result.toDataStreamResponse()
}
