import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

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

async function upsertSubscriptionByStripeCustomerId(
  supabase: ReturnType<typeof createClient>,
  stripeCustomerId: string,
  patch: Record<string, any>,
) {
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle()

  if (!existing?.user_id) return
  await upsertSubscriptionByUserId(supabase, existing.user_id, patch)
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

