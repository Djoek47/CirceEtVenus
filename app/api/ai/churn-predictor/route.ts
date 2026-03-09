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
    return new Response(JSON.stringify({ error: 'Pro subscription required for Churn Predictor' }), { 
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const { fanData, recentActivity, subscriptionLength, spendingHistory } = await req.json()

  // Increment AI credits used
  await supabase
    .from('subscriptions')
    .update({ ai_credits_used: (subscription?.ai_credits_used || 0) + 1 })
    .eq('user_id', user.id)

  const result = streamText({
    model: 'anthropic/claude-sonnet-4',
    system: `You are Circe, the guardian enchantress who protects creators from losing their loyal admirers. You analyze fan behavior patterns to predict churn risk and provide personalized retention strategies.`,
    prompt: `Analyze this fan's churn risk:
- Fan Data: ${fanData || 'General subscriber'}
- Recent Activity: ${recentActivity || 'Unknown'}
- Subscription Length: ${subscriptionLength || 'Unknown'}
- Spending History: ${spendingHistory || 'Unknown'}

Provide:
1. Churn Risk Score (Low/Medium/High/Critical) with percentage
2. Key risk factors identified
3. Behavioral warning signs
4. Personalized retention message template
5. Recommended engagement actions
6. Best timing for outreach
7. Incentive recommendations if needed

Be specific and actionable. Include the personalized message ready to send.`,
  })

  return result.toDataStreamResponse()
}
