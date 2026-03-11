import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemedLogo } from '@/components/themed-logo'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowRight, Moon, Sun, Star, Shield, 
  Check, X, Sparkles, Zap, Crown, Users,
  MessageSquare, Calendar, BarChart3, Lock
} from 'lucide-react'

export const metadata = {
  title: 'Pricing | Circe et Venus',
  description: 'Simple, transparent pricing for content creators. Start with a 14-day free trial.',
}

export default function PricingPage() {
  const plans = [
    {
      name: 'Starter',
      description: 'For new creators just getting started',
      price: 29,
      period: '/month',
      yearlyPrice: 24,
      badge: null,
      cta: 'Start Free Trial',
      ctaVariant: 'outline' as const,
      features: [
        { text: '50 AI Credits/month', included: true },
        { text: '1 Platform Integration', included: true },
        { text: 'Basic Fan Analytics', included: true },
        { text: 'Cosmic Calendar Access', included: true },
        { text: 'Email Support', included: true },
        { text: 'AI Chatter (Limited)', included: true },
        { text: 'Leak Detection', included: false },
        { text: 'Advanced Analytics', included: false },
        { text: 'Priority Support', included: false },
        { text: 'Team Management', included: false },
      ],
    },
    {
      name: 'Pro',
      description: 'For established creators ready to scale',
      price: 49,
      period: '/month',
      yearlyPrice: 39,
      badge: 'Most Popular',
      cta: 'Start Free Trial',
      ctaVariant: 'default' as const,
      highlight: true,
      features: [
        { text: 'Unlimited AI Credits', included: true },
        { text: '3 Platform Integrations', included: true },
        { text: 'Advanced Fan Analytics', included: true },
        { text: 'Cosmic Calendar + Birthday Activation', included: true },
        { text: 'Priority Email Support', included: true },
        { text: 'AI Chatter (Unlimited)', included: true },
        { text: 'Leak Detection & DMCA', included: true },
        { text: 'Revenue Predictions', included: true },
        { text: 'Churn Risk Alerts', included: true },
        { text: 'Content Watermarking', included: true },
      ],
    },
    {
      name: 'Agency',
      description: 'For teams and creator agencies',
      price: 149,
      period: '/month',
      yearlyPrice: 119,
      badge: 'Best Value',
      cta: 'Contact Sales',
      ctaVariant: 'outline' as const,
      features: [
        { text: 'Everything in Pro', included: true },
        { text: 'Unlimited Platform Integrations', included: true },
        { text: 'Team Management (5 seats)', included: true },
        { text: 'White-label Reports', included: true },
        { text: 'Dedicated Success Manager', included: true },
        { text: 'API Access', included: true },
        { text: 'Custom Integrations', included: true },
        { text: 'SLA Guarantee', included: true },
        { text: 'Phone Support', included: true },
        { text: 'Early Feature Access', included: true },
      ],
    },
  ]

  const comparisonFeatures = [
    {
      category: 'AI Credits',
      starter: '50/month',
      pro: 'Unlimited',
      agency: 'Unlimited',
    },
    {
      category: 'Platform Integrations',
      starter: '1',
      pro: '3',
      agency: 'Unlimited',
    },
    {
      category: 'Team Members',
      starter: '1',
      pro: '1',
      agency: '5 (more available)',
    },
    {
      category: 'AI Chatter',
      starter: 'Limited',
      pro: 'Unlimited',
      agency: 'Unlimited',
    },
    {
      category: 'Leak Detection',
      starter: false,
      pro: true,
      agency: true,
    },
    {
      category: 'DMCA Automation',
      starter: false,
      pro: true,
      agency: true,
    },
    {
      category: 'Content Watermarking',
      starter: false,
      pro: true,
      agency: true,
    },
    {
      category: 'Churn Risk Alerts',
      starter: false,
      pro: true,
      agency: true,
    },
    {
      category: 'Revenue Predictions',
      starter: false,
      pro: true,
      agency: true,
    },
    {
      category: 'Cosmic Calendar',
      starter: 'Basic',
      pro: 'Full + Birthday',
      agency: 'Full + Birthday',
    },
    {
      category: 'Analytics',
      starter: 'Basic',
      pro: 'Advanced',
      agency: 'Enterprise',
    },
    {
      category: 'Support',
      starter: 'Email',
      pro: 'Priority Email',
      agency: 'Dedicated Manager',
    },
    {
      category: 'API Access',
      starter: false,
      pro: false,
      agency: true,
    },
    {
      category: 'White-label',
      starter: false,
      pro: false,
      agency: true,
    },
  ]

  const faqs = [
    {
      question: 'How does the 14-day free trial work?',
      answer: 'Start with full access to Pro features for 14 days. No credit card required. Cancel anytime before the trial ends and you won\'t be charged.',
    },
    {
      question: 'Can I change plans later?',
      answer: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle.',
    },
    {
      question: 'What platforms do you integrate with?',
      answer: 'We integrate with OnlyFans, Fansly, MYM, Instagram, TikTok, Twitter, and more. New integrations are added regularly.',
    },
    {
      question: 'How does leak detection work?',
      answer: 'Our AI continuously scans thousands of websites, forums, and file-sharing platforms. When your content is found, we automatically submit DMCA takedown requests.',
    },
    {
      question: 'What are AI Credits used for?',
      answer: 'AI Credits are used for AI Chatter messages, content generation, analytics predictions, and other AI-powered features.',
    },
    {
      question: 'Is my data secure?',
      answer: 'Absolutely. We use bank-level encryption, and sensitive data like birthdays are encrypted with zero-knowledge protocols. We never sell your data.',
    },
  ]

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-background constellation-bg">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <Link href="/" className="flex items-center gap-2 sm:gap-3">
            <ThemedLogo 
              width={36} 
              height={36} 
              className="rounded-full sm:h-10 sm:w-10"
              priority
            />
            <span className="hidden font-serif text-lg font-semibold tracking-wider text-primary sm:inline sm:text-xl">CIRCE ET VENUS</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/features">
              <Button variant="ghost" size="sm" className="text-foreground/80 hover:text-foreground">
                Features
              </Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      <main className="pt-14 sm:pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-24">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
          </div>
          
          <div className="mx-auto max-w-4xl text-center">
            <Badge className="mb-4 gap-1">
              <Sparkles className="h-3 w-3" />
              14-Day Free Trial
            </Badge>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
              Simple, <span className="text-primary">Divine</span> Pricing
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Choose the plan that fits your creator journey. All plans include core features 
              with a 14-day free trial. No credit card required.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <span className="text-sm text-muted-foreground">Monthly</span>
              <Badge variant="outline" className="gap-1 border-primary/50 text-primary">
                Save 20% Yearly
              </Badge>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="px-4 pb-16 sm:px-6 sm:pb-24">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 lg:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative rounded-2xl border p-8 ${
                    plan.highlight
                      ? 'border-2 border-primary bg-gradient-to-b from-primary/10 to-card shadow-lg shadow-primary/10'
                      : 'border-border bg-card'
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className={`${
                        plan.highlight 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-circe text-white'
                      }`}>
                        {plan.badge}
                      </Badge>
                    </div>
                  )}
                  
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold">{plan.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                  
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">${plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      or ${plan.yearlyPrice}/month billed yearly
                    </p>
                  </div>
                  
                  <Link href="/auth/sign-up">
                    <Button 
                      variant={plan.ctaVariant} 
                      className={`w-full ${plan.highlight ? 'bg-primary' : ''}`}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                  
                  <div className="mt-8 space-y-4">
                    {plan.features.map((feature) => (
                      <div key={feature.text} className="flex items-center gap-3 text-sm">
                        {feature.included ? (
                          <Check className={`h-5 w-5 flex-shrink-0 ${
                            plan.highlight ? 'text-primary' : 'text-green-500'
                          }`} />
                        ) : (
                          <X className="h-5 w-5 flex-shrink-0 text-muted-foreground/50" />
                        )}
                        <span className={feature.included ? '' : 'text-muted-foreground/50'}>
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Comparison */}
        <section className="border-y border-border/30 bg-card/30 px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-5xl min-w-0">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Compare Plans
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                Detailed feature comparison to help you choose the right plan.
              </p>
            </div>

            <div className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
              <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-4 pr-4 text-left font-medium">Feature</th>
                    <th className="px-4 py-4 text-center font-medium">Starter</th>
                    <th className="px-4 py-4 text-center font-medium">
                      <div className="flex items-center justify-center gap-2">
                        Pro
                        <Badge className="bg-primary text-primary-foreground text-xs">Popular</Badge>
                      </div>
                    </th>
                    <th className="pl-4 py-4 text-center font-medium">Agency</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((feature) => (
                    <tr key={feature.category} className="border-b border-border/50">
                      <td className="py-4 pr-4 text-sm">{feature.category}</td>
                      <td className="px-4 py-4 text-center text-sm">
                        {typeof feature.starter === 'boolean' ? (
                          feature.starter ? (
                            <Check className="mx-auto h-5 w-5 text-green-500" />
                          ) : (
                            <X className="mx-auto h-5 w-5 text-muted-foreground/30" />
                          )
                        ) : (
                          <span className="text-muted-foreground">{feature.starter}</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center text-sm">
                        {typeof feature.pro === 'boolean' ? (
                          feature.pro ? (
                            <Check className="mx-auto h-5 w-5 text-primary" />
                          ) : (
                            <X className="mx-auto h-5 w-5 text-muted-foreground/30" />
                          )
                        ) : (
                          <span className="font-medium text-primary">{feature.pro}</span>
                        )}
                      </td>
                      <td className="pl-4 py-4 text-center text-sm">
                        {typeof feature.agency === 'boolean' ? (
                          feature.agency ? (
                            <Check className="mx-auto h-5 w-5 text-circe-light" />
                          ) : (
                            <X className="mx-auto h-5 w-5 text-muted-foreground/30" />
                          )
                        ) : (
                          <span className="text-circe-light">{feature.agency}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-3xl">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-6">
              {faqs.map((faq) => (
                <div key={faq.question} className="rounded-lg border border-border bg-card p-6">
                  <h3 className="font-semibold">{faq.question}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border/30 bg-card/30 px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-circe/5 via-card to-amber-500/5 p-8 text-center sm:p-12">
            <div className="mb-6 flex justify-center gap-4">
              <div className="rounded-full bg-circe/20 p-3">
                <Moon className="h-8 w-8 text-circe-light" />
              </div>
              <div className="rounded-full bg-amber-500/20 p-3">
                <Sun className="h-8 w-8 text-amber-400" />
              </div>
            </div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Ready to Start Your Divine Journey?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Join thousands of creators who trust Circe et Venus to grow and protect their business.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/auth/sign-up">
                <Button size="lg" className="gap-2 bg-primary px-8 text-primary-foreground hover:bg-primary/90">
                  Start Free Trial <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/features">
                <Button variant="outline" size="lg" className="px-8">
                  Explore Features
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 bg-card/30 px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <ThemedLogo width={32} height={32} className="rounded-full" />
              <span className="font-serif font-semibold tracking-wider text-primary">CIRCE ET VENUS</span>
            </div>
            <nav className="flex flex-wrap justify-center gap-4 text-sm sm:gap-6">
              <Link href="/" className="text-muted-foreground hover:text-foreground">Home</Link>
              <Link href="/features" className="text-muted-foreground hover:text-foreground">Features</Link>
              <Link href="/pricing" className="text-muted-foreground hover:text-foreground">Pricing</Link>
              <Link href="/how-it-works" className="text-muted-foreground hover:text-foreground">How It Works</Link>
            </nav>
          </div>
          <div className="mt-6 border-t border-border/30 pt-6 text-center">
            <p className="text-sm text-muted-foreground">
              MMXXVI Circe et Venus Inc. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
