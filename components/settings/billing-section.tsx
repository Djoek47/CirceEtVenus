'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkout } from '@/components/stripe/checkout'
import { PRODUCTS } from '@/lib/products'
import { getSubscriptionStatus, createCustomerPortalSession, createCustomerPortalSessionForFlow } from '@/app/actions/stripe'
import { createClient } from '@/lib/supabase/client'
import { 
  CreditCard, Zap, Database, Mail, Check, Loader2, Crown, Shield, Star, Sparkles, Calendar, AlertTriangle
} from 'lucide-react'

interface BillingSectionProps {
  userId?: string
  userEmail?: string
}

interface SubscriptionData {
  id: string
  plan_id: string
  status: string
  ai_credits_used: number
  ai_credits_limit: number
  storage_used_mb: number
  storage_limit_mb: number
  current_period_end: string
  cancel_at_period_end: boolean
  trial_ends_at?: string | null
}

export function BillingSection({ userId, userEmail }: BillingSectionProps) {
  const [subscription, setSubscription] = useState<{
    status: string
    plan: string | null
    planId?: string | null
    currentPeriodEnd?: string
    cancelAtPeriodEnd?: boolean
  } | null>(null)
  const [subData, setSubData] = useState<SubscriptionData | null>(null)
  const [messagesThisMonth, setMessagesThisMonth] = useState<number>(0)
  const [loadingPortal, setLoadingPortal] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const loadSubscriptionData = useCallback(async () => {
    if (!userId) return
    
    // Load from our database for usage stats
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (data) {
      setSubData(data)
    } else {
      // Create default subscription for new users (fallback if trigger didn't run)
      const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      const { data: newSub } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_id: 'divine-trial',
          status: 'trial',
          ai_credits_used: 0,
          ai_credits_limit: 100,
          storage_used_mb: 0,
          storage_limit_mb: 5000,
          trial_ends_at: trialEnd,
          current_period_end: trialEnd,
        })
        .select()
        .single()
      
      if (newSub) setSubData(newSub)
    }

    // Load message activity for this month from analytics snapshots (populated by OnlyFans sync)
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: analyticsRows } = await supabase
      .from('analytics_snapshots')
      .select('messages_received,messages_sent,date,platform')
      .eq('user_id', userId)
      .gte('date', startOfMonth.toISOString().split('T')[0])

    const totalMessages =
      analyticsRows?.reduce((sum, r: any) => sum + (r.messages_received || 0) + (r.messages_sent || 0), 0) || 0
    setMessagesThisMonth(totalMessages)
  }, [userId, supabase])

  useEffect(() => {
    async function loadSubscription() {
      try {
        const status = await getSubscriptionStatus()
        setSubscription(status)
        await loadSubscriptionData()
      } catch (error) {
        console.error('Failed to load subscription:', error)
      } finally {
        setLoading(false)
      }
    }
    loadSubscription()
  }, [loadSubscriptionData])

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

  const openPortalFlow = async (flow: 'payment_method_update' | 'subscription_cancel' | 'subscription_update') => {
    setLoadingPortal(true)
    try {
      const url = await createCustomerPortalSessionForFlow(flow)
      window.location.href = url
    } catch (error) {
      console.error('Failed to create portal session:', error)
      // Fallback to generic portal
      try {
        const url = await createCustomerPortalSession()
        window.location.href = url
      } catch {
        // ignore
      }
    } finally {
      setLoadingPortal(false)
    }
  }

  const currentPlan = subscription?.plan 
    ? PRODUCTS.find(p => p.id === subscription.planId) || PRODUCTS.find(p => p.name === subscription.plan)
    : PRODUCTS.find(p => p.id === 'divine-trial') || PRODUCTS[0]

  // Computed values from subscription data
  const aiCreditsUsed = subData?.ai_credits_used || 0
  const aiCreditsLimit = subData?.ai_credits_limit || 100
  const storageUsedGB = (subData?.storage_used_mb || 0) / 1000
  const storageLimitGB = (subData?.storage_limit_mb || 5000) / 1000
  const dbPeriodEnd = subData?.current_period_end ? new Date(subData.current_period_end) : null
  const statusPeriodEnd = subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null
  const effectivePeriodEnd = dbPeriodEnd || statusPeriodEnd
  const daysRemaining = effectivePeriodEnd
    ? Math.max(0, Math.ceil((effectivePeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 14

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

  const isPaidPlan = subscription?.planId && subscription.planId !== 'divine-trial'
  const hasStripeCustomer = Boolean(subData?.stripe_customer_id)

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
                    : `Trial ends ${subData?.trial_ends_at ? new Date(subData.trial_ends_at).toLocaleDateString() : 'soon'}`
                  }
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">${currentPlan?.priceMonthly || 0}</p>
                <p className="text-sm text-muted-foreground">/month</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {/* Always offer a direct Stripe portal link once we have or can create a customer,
                  so users can manage/cancel even if our local status is lagging behind. */}
              <Button 
                onClick={handleManageBilling} 
                disabled={loadingPortal}
                variant="outline"
              >
                {loadingPortal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Open Stripe Billing Portal
              </Button>

              {subscription?.status === 'active' || isPaidPlan ? (
                <>
                  <Button
                    onClick={() => openPortalFlow('payment_method_update')}
                    disabled={loadingPortal}
                    variant="outline"
                  >
                    Update Payment Method
                  </Button>
                  {!subData?.cancel_at_period_end && (
                    <Button
                      onClick={() => openPortalFlow('subscription_cancel')}
                      disabled={loadingPortal}
                      variant="destructive"
                    >
                      Cancel Subscription
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Checkout 
                    productId="venus-pro" 
                    buttonText="Upgrade to Venus Pro - $49/mo"
                    buttonClassName="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={() =>
                      document
                        .getElementById('pricing-plans')
                        ?.scrollIntoView({ behavior: 'smooth' })
                    }
                  >
                    View All Plans
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Usage Stats */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-border p-4 text-center">
              <Calendar className="mx-auto h-6 w-6 text-primary" />
              <p className="mt-2 font-medium">Days Remaining</p>
              <p className="text-2xl font-bold">{daysRemaining}</p>
              <p className="text-sm text-muted-foreground">
                {subData?.cancel_at_period_end ? 'until cancelled' : 'in period'}
              </p>
            </div>
            <div className="rounded-lg border border-border p-4 text-center">
              <Zap className="mx-auto h-6 w-6 text-primary" />
              <p className="mt-2 font-medium">AI Credits</p>
              <p className="text-2xl font-bold">{aiCreditsUsed}/{aiCreditsLimit === 999999 ? '∞' : aiCreditsLimit}</p>
              <Progress value={(aiCreditsUsed / Math.min(aiCreditsLimit, 1000)) * 100} className="mt-2 h-1" />
            </div>
            <div className="rounded-lg border border-border p-4 text-center">
              <Database className="mx-auto h-6 w-6 text-primary" />
              <p className="mt-2 font-medium">Storage</p>
              <p className="text-2xl font-bold">{storageUsedGB.toFixed(1)}/{storageLimitGB}</p>
              <Progress value={(storageUsedGB / storageLimitGB) * 100} className="mt-2 h-1" />
            </div>
            <div className="rounded-lg border border-border p-4 text-center">
              <Mail className="mx-auto h-6 w-6 text-primary" />
              <p className="mt-2 font-medium">Messages</p>
              <p className="text-2xl font-bold">{messagesThisMonth.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">this month</p>
            </div>
          </div>

          {/* Cancellation Warning */}
          {subData?.cancel_at_period_end && (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <div className="flex-1">
                <p className="font-medium text-amber-500">Subscription Canceling</p>
                <p className="text-sm text-muted-foreground">
                  Your subscription will end on {subData.current_period_end ? new Date(subData.current_period_end).toLocaleDateString() : 'soon'}. 
                  You&apos;ll lose access to Pro features after this date.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => openPortalFlow('subscription_update')} disabled={loadingPortal}>
                Resume
              </Button>
            </div>
          )}
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
