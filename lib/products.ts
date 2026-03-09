export interface Product {
  id: string
  name: string
  description: string
  priceInCents: number
  priceMonthly?: number
  features: string[]
  popular?: boolean
  mode: 'payment' | 'subscription'
}

// Pricing plans for Circe et Venus
export const PRODUCTS: Product[] = [
  {
    id: 'divine-trial',
    name: 'Divine Trial',
    description: '14-day free trial with limited features',
    priceInCents: 0,
    priceMonthly: 0,
    features: [
      '100 AI credits/month',
      '5GB storage',
      'Basic analytics',
      'Email support',
    ],
    mode: 'payment',
  },
  {
    id: 'venus-pro',
    name: 'Venus Pro',
    description: 'For growing creators ready to scale',
    priceInCents: 4900, // $49/month
    priceMonthly: 49,
    features: [
      'Unlimited AI credits',
      '50GB storage',
      'Advanced analytics',
      'Venus growth tools',
      'Priority support',
      'Custom AI training',
    ],
    popular: true,
    mode: 'subscription',
  },
  {
    id: 'circe-elite',
    name: 'Circe Elite',
    description: 'Complete protection and automation',
    priceInCents: 9900, // $99/month
    priceMonthly: 99,
    features: [
      'Everything in Venus Pro',
      'Unlimited storage',
      'Circe protection suite',
      'Advanced leak detection',
      'White-glove onboarding',
      'Dedicated account manager',
      'API access',
    ],
    mode: 'subscription',
  },
  {
    id: 'divine-duo',
    name: 'Divine Duo',
    description: 'The ultimate creator empire package',
    priceInCents: 19900, // $199/month
    priceMonthly: 199,
    features: [
      'Everything in Circe Elite',
      'Multi-account management',
      'Team collaboration',
      'Custom integrations',
      'Revenue analytics',
      'Legal support access',
      'Priority feature requests',
    ],
    mode: 'subscription',
  },
]

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find(p => p.id === id)
}
