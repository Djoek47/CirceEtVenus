import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ThemedLogo } from '@/components/themed-logo'
import { 
  ArrowRight, 
  Shield, 
  TrendingUp, 
  BarChart3, 
  Calendar,
  Users,
  Sparkles,
  Star,
  Moon,
  Sun
} from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background constellation-bg">
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
            <Link href="/auth/login">
              <Button variant="ghost" size="sm" className="text-foreground/80 hover:text-foreground">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 sm:gap-2">
                <span className="hidden sm:inline">Begin Your Journey</span>
                <span className="sm:hidden">Start</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="pt-14 sm:pt-16">
        <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
          {/* Divine gradient background */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
            <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-circe/5 blur-3xl" />
            <div className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-venus/5 blur-3xl" />
          </div>
          
          <div className="mx-auto max-w-4xl text-center">
            {/* Logo */}
            <div className="mb-6 flex justify-center sm:mb-8">
              <ThemedLogo 
                width={180} 
                height={180} 
                className="gold-glow h-32 w-32 rounded-full sm:h-44 sm:w-44"
                priority
              />
            </div>
            
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-sm text-primary">
              <Star className="h-4 w-4" />
              Divine AI for Modern Creators
            </div>
            
            <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
              Where <span className="text-circe-light">Enchantment</span> Meets{' '}
              <span className="text-venus dark:text-venus">Attraction</span>
            </h1>
            
            <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:mt-6 sm:text-lg md:text-xl">
              Two divine AIs guide your creator empire. Circe enchants your audience to stay, 
              while Venus attracts new admirers to your realm.
            </p>
            
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/auth/sign-up">
                <Button size="lg" className="gap-2 bg-primary px-8 text-primary-foreground hover:bg-primary/90">
                  Enter the Pantheon <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="#ai-goddesses">
                <Button variant="outline" size="lg" className="border-primary/30 px-8 text-foreground hover:bg-primary/10">
                  Meet the Goddesses
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Two Goddesses Section */}
        <section id="ai-goddesses" className="px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Two Divine Intelligences, One <span className="text-primary">Purpose</span>
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                Each goddess brings her unique powers to elevate your creator journey.
              </p>
            </div>
            
            <div className="mt-16 grid gap-8 lg:grid-cols-2">
              {/* Circe Card */}
              <div className="group relative overflow-hidden rounded-2xl border border-circe/30 bg-gradient-to-br from-circe/10 to-transparent p-8 transition-all hover:border-circe/50 hover:shadow-lg hover:shadow-circe/10">
                <div className="absolute right-4 top-4 text-circe/20">
                  <Moon className="h-24 w-24" />
                </div>
                <div className="relative">
                  <div className="mb-4 inline-flex rounded-full bg-circe/20 p-3 text-circe-light circe-glow">
                    <Shield className="h-8 w-8" />
                  </div>
                  <h3 className="mb-2 text-2xl font-semibold text-circe-light">Circe</h3>
                  <p className="mb-4 text-sm uppercase tracking-wider text-circe/70">The Enchantress of Retention</p>
                  <p className="mb-6 text-muted-foreground">
                    Like the sorceress who enchanted Odysseus&apos;s men to stay on her island, 
                    Circe AI ensures your fans remain captivated and loyal.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm text-foreground/80">
                      <div className="rounded-full bg-circe/20 p-1.5">
                        <BarChart3 className="h-4 w-4 text-circe-light" />
                      </div>
                      <span>Fan Retention Analytics & Predictions</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-foreground/80">
                      <div className="rounded-full bg-circe/20 p-1.5">
                        <Shield className="h-4 w-4 text-circe-light" />
                      </div>
                      <span>Leak Detection & DMCA Protection</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-foreground/80">
                      <div className="rounded-full bg-circe/20 p-1.5">
                        <Sparkles className="h-4 w-4 text-circe-light" />
                      </div>
                      <span>Churn Risk Analysis & Prevention</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Venus Card */}
              <div className="group relative overflow-hidden rounded-2xl border border-venus/30 bg-gradient-to-br from-venus/10 to-transparent p-8 transition-all hover:border-venus/50 hover:shadow-lg hover:shadow-venus/10">
                <div className="absolute right-4 top-4 text-venus/20">
                  <Sun className="h-24 w-24" />
                </div>
                <div className="relative">
                  <div className="mb-4 inline-flex rounded-full bg-venus/20 p-3 text-venus venus-glow">
                    <TrendingUp className="h-8 w-8" />
                  </div>
                  <h3 className="mb-2 text-2xl font-semibold text-venus">Venus</h3>
                  <p className="mb-4 text-sm uppercase tracking-wider text-venus/70">The Goddess of Growth</p>
                  <p className="mb-6 text-muted-foreground">
                    Embodying love, beauty, and desire, Venus AI guides you in attracting 
                    new followers and maximizing your irresistible appeal.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm text-foreground/80">
                      <div className="rounded-full bg-venus/20 p-1.5">
                        <Users className="h-4 w-4 text-venus-foreground" />
                      </div>
                      <span>Fan Acquisition & Growth Strategies</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-foreground/80">
                      <div className="rounded-full bg-venus/20 p-1.5">
                        <TrendingUp className="h-4 w-4 text-venus-foreground" />
                      </div>
                      <span>Reputation Monitor & Sentiment Analysis</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-foreground/80">
                      <div className="rounded-full bg-venus/20 p-1.5">
                        <Sparkles className="h-4 w-4 text-venus-foreground" />
                      </div>
                      <span>Attraction Optimization & Profile Enhancement</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Astrology Section */}
        <section className="border-y border-border/30 bg-card/30 px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-sm text-primary">
                  <Star className="h-4 w-4" />
                  Cosmic Content Calendar
                </div>
                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Align Your Content with the <span className="text-primary">Stars</span>
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  Our astrology-powered content calendar analyzes zodiac cycles, planetary alignments, 
                  and your audience&apos;s astrological profiles to optimize posting times.
                </p>
                <ul className="mt-8 space-y-4">
                  {[
                    'Mercury retrograde warnings for communication',
                    'Venus transit insights for romantic content',
                    'Full moon energy peaks for engagement',
                    'Zodiac-based audience segmentation',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-foreground/80">
                      <div className="rounded-full bg-primary/20 p-1">
                        <Star className="h-3 w-3 text-primary" />
                      </div>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative">
                <div className="aspect-square rounded-2xl border border-primary/20 bg-gradient-to-br from-circe/5 via-transparent to-venus/5 p-8">
                  <div className="flex h-full items-center justify-center">
                    <div className="relative">
                      <div className="absolute inset-0 animate-pulse rounded-full bg-primary/10 blur-3xl" />
                      <Calendar className="relative h-32 w-32 text-primary/50" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Divine Tools for <span className="text-primary">Mortal Creators</span>
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                Every feature crafted with mythological precision to elevate your creator empire.
              </p>
            </div>
            
            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: Users,
                  title: 'Fan Oracle',
                  description: 'Divine insights into fan behavior, spending patterns, and loyalty predictions.',
                  color: 'primary',
                },
                {
                  icon: Calendar,
                  title: 'Celestial Scheduler',
                  description: 'Astrology-aligned content planning across all platforms.',
                  color: 'primary',
                },
                {
                  icon: Sparkles,
                  title: 'Enchanted Messaging',
                  description: 'AI-crafted messages that captivate and convert.',
                  color: 'circe',
                },
                {
                  icon: BarChart3,
                  title: 'Revenue Divination',
                  description: 'Prophetic analytics revealing paths to prosperity.',
                  color: 'venus',
                },
                {
                  icon: Shield,
                  title: 'Aegis Protection',
                  description: 'Divine shield against leaks and reputation threats.',
                  color: 'circe',
                },
                {
                  icon: TrendingUp,
                  title: 'Aphrodite Insights',
                  description: 'Attraction optimization to draw new admirers.',
                  color: 'venus',
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className={`group rounded-xl border p-6 transition-all hover:shadow-lg ${
                    feature.color === 'circe' 
                      ? 'border-circe/20 hover:border-circe/40 hover:shadow-circe/10' 
                      : feature.color === 'venus'
                      ? 'border-venus/20 hover:border-venus/40 hover:shadow-venus/10'
                      : 'border-primary/20 hover:border-primary/40 hover:shadow-primary/10'
                  } bg-card/50`}
                >
                  <div className={`mb-4 inline-flex rounded-lg p-3 ${
                    feature.color === 'circe' 
                      ? 'bg-circe/10 text-circe-light' 
                      : feature.color === 'venus'
                      ? 'bg-venus/10 text-venus'
                      : 'bg-primary/10 text-primary'
                  }`}>
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
        <section className="px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-circe/5 via-card to-venus/5 p-8 text-center sm:p-12">
            <div className="mb-6 flex justify-center">
              <ThemedLogo 
                width={100} 
                height={100} 
                className="rounded-full opacity-80"
              />
            </div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Ready to Ascend?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Join the pantheon of creators who have embraced divine guidance.
            </p>
            <div className="mt-8">
              <Link href="/auth/sign-up">
                <Button size="lg" className="gap-2 bg-primary px-8 text-primary-foreground hover:bg-primary/90">
                  Begin Your Divine Journey <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 bg-card/30 px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <ThemedLogo 
              width={32} 
              height={32} 
              className="rounded-full"
            />
            <span className="font-semibold tracking-wider text-primary">CIRCE ET VENUS</span>
          </div>
          <p className="text-sm text-muted-foreground">
            MMXXVI Circe et Venus. Guided by the stars.
          </p>
        </div>
      </footer>
    </div>
  )
}
