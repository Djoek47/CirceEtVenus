import 'server-only'

import Stripe from 'stripe'

let stripeSingleton: Stripe | null = null

/** Lazy init so `next build` can analyze routes without Stripe env at import time. */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key, {
      apiVersion: '2026-01-28.clover',
    })
  }
  return stripeSingleton
}
