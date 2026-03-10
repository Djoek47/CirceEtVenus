'use server'

import { stripe } from '@/lib/stripe'
import { PRODUCTS } from '@/lib/products'
import { createClient } from '@/lib/supabase/server'

type SubscriptionRowUpdate = {
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  plan_id?: string
  status?: string
  current_period_start?: string | null
  current_period_end?: string | null
  cancel_at_period_end?: boolean | null
}

function getPlanLimits(planId: string) {
  switch (planId) {
    case 'venus-pro':
      return { ai_credits_limit: 999999, storage_limit_mb: 51200 } // 50GB
    case 'circe-elite':
      return { ai_credits_limit: 999999, storage_limit_mb: 999999 } // "unlimited"
    case 'divine-duo':
      return { ai_credits_limit: 999999, storage_limit_mb: 999999 } // "unlimited"
    case 'divine-trial':
    default:
      return { ai_credits_limit: 100, storage_limit_mb: 5120 } // 5GB
  }
}

async function upsertSubscriptionRow(
  userId: string,
  patch: SubscriptionRowUpdate & Partial<ReturnType<typeof getPlanLimits>>,
) {
  const supabase = await createClient()
  await supabase
    .from('subscriptions')
    .upsert(
      {
        user_id: userId,
        ...patch,
        ...(patch.plan_id ? getPlanLimits(patch.plan_id) : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
}

async function findOrCreateStripeCustomer(params: { userId: string; email: string }) {
  // Prefer an existing customer id stored in DB.
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', params.userId)
    .maybeSingle()

  if (existing?.stripe_customer_id) return existing.stripe_customer_id

  // Fall back to lookup by email, else create.
  const customers = await stripe.customers.list({ email: params.email, limit: 1 })
  const customerId =
    customers.data[0]?.id ??
    (await stripe.customers.create({
      email: params.email,
      metadata: { userId: params.userId },
    })).id

  await upsertSubscriptionRow(params.userId, { stripe_customer_id: customerId })
  return customerId
}

export async function startCheckoutSession(productId: string) {
  const product = PRODUCTS.find((p) => p.id === productId)
  if (!product) {
    throw new Error(`Product with id "${productId}" not found`)
  }

  // Get current user for metadata
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    throw new Error('User not authenticated')
  }

  const customerId = await findOrCreateStripeCustomer({ userId: user.id, email: user.email })

  const sessionConfig: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    ui_mode: 'embedded',
    redirect_on_completion: 'never',
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.name,
            description: product.description,
          },
          unit_amount: product.priceInCents,
          ...(product.mode === 'subscription' ? { recurring: { interval: 'month' } } : {}),
        },
        quantity: 1,
      },
    ],
    mode: product.mode,
    metadata: {
      productId: product.id,
      userId: user.id,
    },
    ...(product.mode === 'subscription'
      ? {
          subscription_data: {
            metadata: {
              productId: product.id,
              userId: user.id,
            },
          },
        }
      : {}),
  }

  const session = await stripe.checkout.sessions.create(sessionConfig)
  return session.client_secret
}

export async function createCustomerPortalSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User not authenticated')
  }
  if (!user.email) {
    throw new Error('User email missing')
  }

  const customerId = await findOrCreateStripeCustomer({ userId: user.id, email: user.email })

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || 'https://circe-venus.vercel.app'

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/dashboard/settings?tab=billing`,
  })

  return session.url
}

export async function createCustomerPortalSessionForFlow(flow: 'payment_method_update' | 'subscription_cancel' | 'subscription_update') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('User not authenticated')
  if (!user.email) throw new Error('User email missing')

  const customerId = await findOrCreateStripeCustomer({ userId: user.id, email: user.email })

  const { data: subRow } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || 'https://circe-venus.vercel.app'
  const return_url = `${appUrl}/dashboard/settings?tab=billing`

  // If we don't have a subscription id yet, fall back to the generic portal (user can still manage methods/invoices).
  const subscriptionId = subRow?.stripe_subscription_id || undefined

  const flow_data =
    flow === 'payment_method_update'
      ? { type: 'payment_method_update' as const }
      : flow === 'subscription_cancel'
        ? (subscriptionId ? { type: 'subscription_cancel' as const, subscription: subscriptionId } : undefined)
        : (subscriptionId ? { type: 'subscription_update' as const, subscription: subscriptionId } : undefined)

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url,
    ...(flow_data ? { flow_data } : {}),
  })

  return session.url
}

export async function getSubscriptionStatus() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { status: 'none', plan: null }
  }

  // Primary source of truth for the app UI is our DB row (kept in sync via webhook),
  // but we also reconcile with Stripe if needed so upgrades still work even when
  // the webhook isn't fully configured yet.
  let { data } = await supabase
    .from('subscriptions')
    .select('plan_id,status,current_period_end,cancel_at_period_end,stripe_customer_id,stripe_subscription_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!data) return { status: 'none', plan: null }

  // If we don't have an active subscription recorded yet but there is a Stripe customer,
  // try to reconcile with Stripe directly.
  const needsSync =
    !data.plan_id ||
    !data.status ||
    data.status === 'trial' ||
    !data.stripe_subscription_id

  try {
    if (needsSync) {
      let customerId = data.stripe_customer_id as string | null | undefined

      // Ensure we have a Stripe customer id for this user
      if (!customerId && user.email) {
        customerId = await findOrCreateStripeCustomer({ userId: user.id, email: user.email })
      }

      if (customerId) {
        const subs = await stripe.subscriptions.list({
          customer: customerId,
          status: 'all',
          limit: 1,
        })

        const sub = subs.data[0]
        if (sub) {
          const planIdFromMetadata = (sub.metadata?.productId as string | undefined) || (data.plan_id as string | undefined)
          await upsertSubscriptionRow(user.id, {
            stripe_customer_id: customerId,
            stripe_subscription_id: sub.id,
            plan_id: planIdFromMetadata,
            status: sub.status,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
          })

          data = {
            ...data,
            plan_id: planIdFromMetadata,
            status: sub.status,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
          } as typeof data
        }
      }
    }
  } catch {
    // If reconciliation fails for any reason, fall back to whatever is in our DB.
  }

  const product = PRODUCTS.find((p) => p.id === data.plan_id)
  return {
    status: data.status,
    plan: product?.name || product?.id || null,
    currentPeriodEnd: data.current_period_end ? new Date(data.current_period_end).toISOString() : undefined,
    cancelAtPeriodEnd: data.cancel_at_period_end ?? undefined,
    planId: data.plan_id,
  }
}
