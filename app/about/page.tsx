import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemedLogo } from '@/components/themed-logo'
import { 
  ArrowRight, Moon, Sun, Star, Shield, TrendingUp, 
  Users, Heart, Sparkles, Target
} from 'lucide-react'

export const metadata = {
  title: 'About | Circe et Venus',
  description: 'Learn about Circe et Venus - Divine AI for Modern Creators',
}

export default function AboutPage() {
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
            <Link href="/how-it-works">
              <Button variant="ghost" size="sm" className="text-foreground/80 hover:text-foreground">
                How It Works
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
            <div className="mb-6 flex justify-center">
              <ThemedLogo 
                width={140} 
                height={140} 
                className="rounded-full"
                priority
              />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
              About <span className="text-primary">Circe et Venus</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              We are building the most powerful AI-driven platform for content creators, 
              combining ancient wisdom with modern technology.
            </p>
          </div>
        </section>

        {/* Our Story */}
        <section className="px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Our Story
                </h2>
                <div className="mt-6 space-y-4 text-muted-foreground">
                  <p>
                    Circe et Venus was born from a simple observation: content creators needed 
                    more than just analytics tools. They needed divine guidance.
                  </p>
                  <p>
                    We drew inspiration from mythology - Circe, the enchantress who kept 
                    Odysseus captivated, and Venus, the goddess of love and attraction. 
                    These two forces represent the dual nature of creator success: 
                    retention and growth.
                  </p>
                  <p>
                    Our AI-powered platform combines these mythological archetypes with 
                    cutting-edge machine learning to provide creators with insights and 
                    tools that feel almost magical.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-circe/30 bg-circe/5 p-6 text-center">
                  <Moon className="mx-auto h-12 w-12 text-circe-light" />
                  <h3 className="mt-4 font-semibold text-circe-light">Circe</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Enchantment & Retention</p>
                </div>
                <div className="rounded-xl border border-venus/30 bg-venus/5 p-6 text-center">
                  <Sun className="mx-auto h-12 w-12 text-venus" />
                  <h3 className="mt-4 font-semibold text-venus">Venus</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Attraction & Growth</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="border-y border-border/30 bg-card/30 px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-4xl text-center">
            <Star className="mx-auto h-12 w-12 text-primary" />
            <h2 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
              Our Mission
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              To empower content creators with divine intelligence, helping them build 
              sustainable empires through the perfect balance of fan retention and 
              audience growth.
            </p>
          </div>
        </section>

        {/* Values */}
        <section className="px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">
              Our Values
            </h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Shield,
                  title: 'Protection First',
                  description: 'Your content security is our sacred duty.',
                  color: 'circe',
                },
                {
                  icon: Heart,
                  title: 'Creator-Centric',
                  description: 'Every feature designed with creators in mind.',
                  color: 'venus',
                },
                {
                  icon: Sparkles,
                  title: 'Innovation',
                  description: 'Pushing boundaries with AI and technology.',
                  color: 'primary',
                },
                {
                  icon: Users,
                  title: 'Community',
                  description: 'Building a divine network of creators.',
                  color: 'primary',
                },
              ].map((value) => (
                <div
                  key={value.title}
                  className={`rounded-xl border p-6 text-center ${
                    value.color === 'circe' 
                      ? 'border-circe/20 bg-circe/5' 
                      : value.color === 'venus'
                      ? 'border-venus/20 bg-venus/5'
                      : 'border-primary/20 bg-primary/5'
                  }`}
                >
                  <value.icon className={`mx-auto h-10 w-10 ${
                    value.color === 'circe' 
                      ? 'text-circe-light' 
                      : value.color === 'venus'
                      ? 'text-venus'
                      : 'text-primary'
                  }`} />
                  <h3 className="mt-4 font-semibold">{value.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-circe/5 via-card to-venus/5 p-8 text-center sm:p-12">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Ready to Begin?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Join thousands of creators who have embraced divine guidance.
            </p>
            <div className="mt-8">
              <Link href="/auth/sign-up">
                <Button size="lg" className="gap-2 bg-primary px-8 text-primary-foreground hover:bg-primary/90">
                  Start Your Journey <ArrowRight className="h-4 w-4" />
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
              <Link href="/about" className="text-muted-foreground hover:text-foreground">About</Link>
              <Link href="/how-it-works" className="text-muted-foreground hover:text-foreground">How It Works</Link>
              <Link href="/terms" className="text-muted-foreground hover:text-foreground">Terms</Link>
              <Link href="/privacy" className="text-muted-foreground hover:text-foreground">Privacy</Link>
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
