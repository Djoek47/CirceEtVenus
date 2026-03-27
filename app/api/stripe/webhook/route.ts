import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

// Stripe endpoint to register: https://www.circeetvenus.com/api/stripe/webhook
// During phased cutover, keep https://www.cetv.app/api/stripe/webhook active temporarily.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

const PRO_PLANS = ['venus-pro', 'circe-elite', 'divine-duo']

function getPlanLimits(planId: string) {
  switch (planId) {
    case 'venus-pro':
      return { ai_credits_limit: 999999, storage_limit_mb: 51200 } // 50GB
    case 'circe-elite':
      return { ai_credits_limit: 999999, storage_limit_mb: 999999 }
    case 'divine-duo':
      return { ai_credits_limit: 999999, storage_limit_mb: 999999 }
    case 'divine-trial':
    default:
      return { ai_credits_limit: 100, storage_limit_mb: 5120 }
  }
}

async function upsertSubscriptionByUserId(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  patch: Record<string, any>,
) {
  const planId = patch.plan_id as string | undefined
  await supabase
    .from('subscriptions')
    .upsert(
      {
        user_id: userId,
        ...patch,
        ...(planId ? getPlanLimits(planId) : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
}

async function notifyPlanChange(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  planId: string | undefined,
) {
  if (!planId || !PRO_PLANS.includes(planId.toLowerCase())) return
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'system',
    title: 'Plan upgraded',
    description: 'Your Pro plan is now active. You have full access to Circe & Venus tools.',
    link: '/dashboard/ai-studio',
    read: false,
  })
}

async function upsertSubscriptionByStripeCustomerId(
  supabase: ReturnType<typeof createClient>,
  stripeCustomerId: string,
  patch: Record<string, any>,
) {
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('user_id,current_period_start,last_reset_at,plan_id')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle()

  if (!existing?.user_id) return

  const incomingStart = patch.current_period_start as string | undefined
  const existingStart = existing.current_period_start as string | null | undefined
  const shouldReset =
    typeof incomingStart === 'string' &&
    incomingStart.length > 0 &&
    (!existingStart || new Date(incomingStart).getTime() !== new Date(existingStart).getTime())

  const resetPatch = shouldReset
    ? {
        ai_credits_used: 0,
        messages_sent: 0,
        api_calls_used: 0,
        last_reset_at: new Date().toISOString(),
      }
    : {}

  const incomingPlanId = (patch.plan_id as string)?.toLowerCase()
  const wasPro = existing.plan_id && PRO_PLANS.includes(String(existing.plan_id).toLowerCase())
  const isPro = incomingPlanId && PRO_PLANS.includes(incomingPlanId)

  await upsertSubscriptionByUserId(supabase, existing.user_id, { ...patch, ...resetPatch })

  if (isPro && !wasPro) {
    await notifyPlanChange(supabase, existing.user_id, patch.plan_id)
  }
}

export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Missing STRIPE_WEBHOOK_SECRET' }, { status: 500 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  const rawBody = await req.text()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const planId = session.metadata?.productId
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id

        if (userId && customerId) {
          await upsertSubscriptionByUserId(supabase, userId, {
            stripe_customer_id: customerId,
            ...(planId ? { plan_id: planId } : {}),
          })
          if (planId) await notifyPlanChange(supabase, userId, planId)
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        const planId = sub.metadata?.productId

        await upsertSubscriptionByStripeCustomerId(supabase, customerId, {
          stripe_subscription_id: sub.id,
          ...(planId ? { plan_id: planId } : {}),
          status: sub.status,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
        })
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id

        await upsertSubscriptionByStripeCustomerId(supabase, customerId, {
          stripe_subscription_id: sub.id,
          status: 'canceled',
          cancel_at_period_end: false,
        })
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
        if (customerId) {
          await upsertSubscriptionByStripeCustomerId(supabase, customerId, {
            status: 'active',
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
        if (customerId) {
          await upsertSubscriptionByStripeCustomerId(supabase, customerId, {
            status: 'past_due',
          })
        }
        break
      }

      default:
        break
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook handler error'
    return NextResponse.json({ received: true, error: message }, { status: 200 })
  }
}

