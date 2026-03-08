import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
  ArrowRight, 
  Shield, 
  MessageSquare, 
  BarChart3, 
  Calendar,
  Users,
  Zap
} from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">CREATRIX</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button size="sm" className="gap-2">
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="pt-16">
        <section className="relative overflow-hidden px-6 py-24 sm:py-32">
          {/* Background gradient */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
          </div>
          
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-sm text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Now supporting OnlyFans, MYM, and Fansly
            </div>
            
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Manage Your Creator Empire{' '}
              <span className="text-primary">Like a Pro</span>
            </h1>
            
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
              The all-in-one platform for content creators and agencies. 
              Manage fans, schedule content, track analytics, and protect your brand across all platforms.
            </p>
            
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/auth/sign-up">
                <Button size="lg" className="gap-2 px-8">
                  Start Free Trial <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="lg" className="px-8">
                  See Features
                </Button>
              </Link>
            </div>
            
            <p className="mt-4 text-sm text-muted-foreground">
              No credit card required. 14-day free trial.
            </p>
          </div>
        </section>

        {/* Stats Section */}
        <section className="border-y border-border bg-card/50 py-12">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 sm:grid-cols-4">
            {[
              { value: '10K+', label: 'Active Creators' },
              { value: '$50M+', label: 'Revenue Managed' },
              { value: '99.9%', label: 'Uptime' },
              { value: '24/7', label: 'Support' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-primary sm:text-4xl">{stat.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Everything You Need to{' '}
                <span className="text-primary">Scale</span>
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                Powerful tools designed specifically for content creators and management agencies.
              </p>
            </div>
            
            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: Users,
                  title: 'Fan CRM',
                  description: 'Track every interaction, segment fans by spending, and never miss a high-value conversation.',
                },
                {
                  icon: Calendar,
                  title: 'Content Scheduler',
                  description: 'Plan and schedule content across all platforms from a single dashboard.',
                },
                {
                  icon: MessageSquare,
                  title: 'Smart Messaging',
                  description: 'AI-powered message suggestions and automated responses for common queries.',
                },
                {
                  icon: BarChart3,
                  title: 'Analytics Hub',
                  description: 'Deep insights into revenue, engagement, and fan behavior across platforms.',
                },
                {
                  icon: Shield,
                  title: 'Leak Protection',
                  description: 'Real-time monitoring for leaked content with automatic DMCA takedown requests.',
                },
                {
                  icon: Zap,
                  title: 'Reputation Monitor',
                  description: 'Track mentions and sentiment across social media and review sites.',
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:bg-card/80"
                >
                  <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-6 py-24">
          <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-card p-8 text-center sm:p-12">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to Take Control?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Join thousands of creators who are already using CREATRIX to grow their business.
            </p>
            <div className="mt-8">
              <Link href="/auth/sign-up">
                <Button size="lg" className="gap-2 px-8">
                  Start Your Free Trial <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 px-6 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">CREATRIX</span>
          </div>
          <p className="text-sm text-muted-foreground">
            2026 CREATRIX. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
