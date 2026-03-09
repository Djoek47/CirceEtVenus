'use server'

import { stripe } from '@/lib/stripe'
import { PRODUCTS } from '@/lib/products'
import { createClient } from '@/lib/supabase/server'

export async function startCheckoutSession(productId: string) {
  const product = PRODUCTS.find((p) => p.id === productId)
  if (!product) {
    throw new Error(`Product with id "${productId}" not found`)
  }

  // Get current user for metadata
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const sessionConfig: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    ui_mode: 'embedded',
    redirect_on_completion: 'never',
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
      userId: user?.id || 'anonymous',
    },
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

  // Look up Stripe customer by email
  const customers = await stripe.customers.list({
    email: user.email,
    limit: 1,
  })

  if (customers.data.length === 0) {
    throw new Error('No Stripe customer found')
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customers.data[0].id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings?tab=billing`,
  })

  return session.url
}

export async function getSubscriptionStatus() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { status: 'none', plan: null }
  }

  // Look up Stripe customer
  const customers = await stripe.customers.list({
    email: user.email,
    limit: 1,
  })

  if (customers.data.length === 0) {
    return { status: 'none', plan: null }
  }

  // Get active subscriptions
  const subscriptions = await stripe.subscriptions.list({
    customer: customers.data[0].id,
    status: 'active',
    limit: 1,
  })

  if (subscriptions.data.length === 0) {
    return { status: 'none', plan: null }
  }

  const subscription = subscriptions.data[0]
  const productId = subscription.metadata?.productId || 'unknown'
  const product = PRODUCTS.find(p => p.id === productId)

  return {
    status: subscription.status,
    plan: product?.name || 'Unknown Plan',
    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  }
}
