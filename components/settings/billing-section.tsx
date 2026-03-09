'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkout } from '@/components/stripe/checkout'
import { PRODUCTS } from '@/lib/products'
import { getSubscriptionStatus, createCustomerPortalSession } from '@/app/actions/stripe'
import { 
  CreditCard, Zap, Database, Mail, Check, Loader2, Crown, Shield, Star, Sparkles
} from 'lucide-react'

interface BillingSectionProps {
  userId?: string
  userEmail?: string
}

export function BillingSection({ userId, userEmail }: BillingSectionProps) {
  const [subscription, setSubscription] = useState<{
    status: string
    plan: string | null
    currentPeriodEnd?: string
    cancelAtPeriodEnd?: boolean
  } | null>(null)
  const [loadingPortal, setLoadingPortal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSubscription() {
      try {
        const status = await getSubscriptionStatus()
        setSubscription(status)
      } catch (error) {
        console.error('Failed to load subscription:', error)
      } finally {
        setLoading(false)
      }
    }
    loadSubscription()
  }, [])

  const handleManageBilling = async () => {
    setLoadingPortal(true)
    try {
      const url = await createCustomerPortalSession()
      window.location.href = url
    } catch (error) {
      console.error('Failed to create portal session:', error)
    } finally {
      setLoadingPortal(false)
    }
  }

  const currentPlan = subscription?.plan 
    ? PRODUCTS.find(p => p.name === subscription.plan) 
    : PRODUCTS[0] // Default to Divine Trial

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'venus-pro': return <Star className="h-5 w-5 text-gold" />
      case 'circe-elite': return <Shield className="h-5 w-5 text-circe-light" />
      case 'divine-duo': return <Crown className="h-5 w-5 text-primary" />
      default: return <Sparkles className="h-5 w-5 text-muted-foreground" />
    }
  }

  if (loading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* Current Plan */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-semibold">
            <CreditCard className="h-5 w-5" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-6">
            <div className="flex items-center justify-between">
              <div>
                <Badge className="mb-2 bg-primary/20 text-primary">
                  {subscription?.status === 'active' ? 'ACTIVE' : 'FREE TRIAL'}
                </Badge>
                <h3 className="text-xl font-semibold">{currentPlan?.name || 'Divine Trial'}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {subscription?.status === 'active' 
                    ? `Renews ${subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'soon'}`
                    : '14-day free trial - 10 days remaining'
                  }
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">${currentPlan?.priceMonthly || 0}</p>
                <p className="text-sm text-muted-foreground">/month</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {subscription?.status === 'active' ? (
                <Button 
                  onClick={handleManageBilling} 
                  disabled={loadingPortal}
                  variant="outline"
                >
                  {loadingPortal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Manage Subscription
                </Button>
              ) : (
                <>
                  <Checkout 
                    productId="venus-pro" 
                    buttonText="Upgrade to Venus Pro - $49/mo"
                    buttonClassName="flex-1"
                  />
                  <Button variant="outline" onClick={() => document.getElementById('pricing-plans')?.scrollIntoView({ behavior: 'smooth' })}>
                    View All Plans
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Usage Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border p-4 text-center">
              <Zap className="mx-auto h-6 w-6 text-primary" />
              <p className="mt-2 font-medium">AI Credits</p>
              <p className="text-2xl font-bold">47/100</p>
              <p className="text-sm text-muted-foreground">this month</p>
            </div>
            <div className="rounded-lg border border-border p-4 text-center">
              <Database className="mx-auto h-6 w-6 text-primary" />
              <p className="mt-2 font-medium">Storage</p>
              <p className="text-2xl font-bold">1.2/5</p>
              <p className="text-sm text-muted-foreground">GB used</p>
            </div>
            <div className="rounded-lg border border-border p-4 text-center">
              <Mail className="mx-auto h-6 w-6 text-primary" />
              <p className="mt-2 font-medium">Messages</p>
              <p className="text-2xl font-bold">234</p>
              <p className="text-sm text-muted-foreground">this month</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Plans */}
      <Card id="pricing-plans" className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-semibold">Available Plans</CardTitle>
          <CardDescription>Choose the plan that fits your needs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {PRODUCTS.map((product) => (
              <div 
                key={product.id}
                className={`relative rounded-lg border p-4 ${
                  product.popular 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border'
                }`}
              >
                {product.popular && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary">
                    Most Popular
                  </Badge>
                )}
                <div className="mb-4 flex items-center gap-2">
                  {getPlanIcon(product.id)}
                  <h4 className="font-semibold">{product.name}</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{product.description}</p>
                <p className="text-2xl font-bold mb-4">
                  ${product.priceMonthly}
                  <span className="text-sm font-normal text-muted-foreground">/mo</span>
                </p>
                <ul className="space-y-2 mb-4">
                  {product.features.slice(0, 4).map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                  {product.features.length > 4 && (
                    <li className="text-sm text-muted-foreground">
                      +{product.features.length - 4} more features
                    </li>
                  )}
                </ul>
                {product.priceInCents > 0 && (
                  <Checkout 
                    productId={product.id}
                    buttonText={currentPlan?.id === product.id ? 'Current Plan' : 'Select Plan'}
                    buttonVariant={product.popular ? 'default' : 'outline'}
                    buttonClassName="w-full"
                  >
                    <Button 
                      variant={product.popular ? 'default' : 'outline'} 
                      className="w-full"
                      disabled={currentPlan?.id === product.id}
                    >
                      {currentPlan?.id === product.id ? 'Current Plan' : 'Select Plan'}
                    </Button>
                  </Checkout>
                )}
                {product.priceInCents === 0 && (
                  <Button variant="outline" className="w-full" disabled>
                    {currentPlan?.id === product.id ? 'Current Plan' : 'Free Trial'}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-semibold">Billing History</CardTitle>
          <CardDescription>View your past invoices</CardDescription>
        </CardHeader>
        <CardContent>
          {subscription?.status === 'active' ? (
            <Button variant="outline" onClick={handleManageBilling} disabled={loadingPortal}>
              {loadingPortal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              View Invoices in Stripe Portal
            </Button>
          ) : (
            <p className="text-center text-muted-foreground py-8">No invoices yet</p>
          )}
        </CardContent>
      </Card>
    </>
  )
}
