'use client'

import Link from 'next/link'
import { ArrowLeft, Moon, Sun, Star, Shield, TrendingUp, Heart, Sparkles } from 'lucide-react'
import { ThemedLogo } from '@/components/themed-logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function AboutPage() {
  const team = [
    {
      name: 'The Founders',
      role: 'Visionaries',
      description: 'Former top creators who understood the need for intelligent tools.',
    },
    {
      name: 'AI Research Team',
      role: 'The Enchanters',
      description: 'Building divine intelligence for creator success.',
    },
    {
      name: 'Security Team',
      role: 'The Guardians',
      description: 'Protecting creator content and privacy.',
    },
    {
      name: 'Growth Team',
      role: 'The Cultivators',
      description: 'Helping creators reach their full potential.',
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <ThemedLogo width={32} height={32} className="rounded-full" />
            <span className="font-serif text-lg font-semibold text-primary">CIRCE ET VENUS</span>
          </Link>
          <Button variant="ghost" asChild>
            <Link href="/" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-transparent py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <div className="mb-6 flex justify-center">
            <ThemedLogo width={120} height={120} className="rounded-full" />
          </div>
          <h1 className="font-serif text-4xl font-bold">About Circe et Venus</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Where ancient wisdom meets modern technology. We empower content creators with 
            divine intelligence to enchant their audience and grow their empire.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h2 className="font-serif text-2xl font-bold">Our Mission</h2>
              <p className="mt-4 text-muted-foreground">
                We believe every creator deserves access to powerful tools that were once only
                available to agencies and top earners. Our mission is to democratize creator success
                through AI-powered insights, intelligent automation, and divine guidance.
              </p>
              <p className="mt-4 text-muted-foreground">
                By combining the enchanting retention powers of Circe with the attractive growth
                magic of Venus, we provide a complete ecosystem for creator empowerment.
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-circe/30 bg-circe/5 p-4">
                <Moon className="mt-1 h-5 w-5 text-circe" />
                <div>
                  <h3 className="font-medium text-circe">Circe: Retention</h3>
                  <p className="text-sm text-muted-foreground">
                    Like the mythological sorceress, we help you keep your audience enchanted.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-venus/30 bg-venus/5 p-4">
                <Sun className="mt-1 h-5 w-5 text-venus" />
                <div>
                  <h3 className="font-medium text-venus">Venus: Growth</h3>
                  <p className="text-sm text-muted-foreground">
                    Channel the goddess of attraction to grow your following irresistibly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="border-y border-border bg-card/30 py-16">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-center font-serif text-2xl font-bold">Our Values</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <Card className="border-border bg-card">
              <CardContent className="pt-6 text-center">
                <Shield className="mx-auto h-10 w-10 text-primary" />
                <h3 className="mt-4 font-semibold">Creator First</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your content, your empire. We protect what you build and never compromise your privacy.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="pt-6 text-center">
                <Sparkles className="mx-auto h-10 w-10 text-primary" />
                <h3 className="mt-4 font-semibold">Innovation</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Cutting-edge AI that evolves with the creator economy and stays ahead of trends.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="pt-6 text-center">
                <Heart className="mx-auto h-10 w-10 text-primary" />
                <h3 className="mt-4 font-semibold">Empowerment</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Tools that give you superpowers, not replace you. Amplify your unique voice.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-center font-serif text-2xl font-bold">The Divine Council</h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-muted-foreground">
            Our team combines creator experience with technical excellence.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {team.map((member) => (
              <div
                key={member.name}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Star className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{member.name}</h3>
                    <p className="text-sm text-muted-foreground">{member.role}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{member.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-card/30 py-16">
        <div className="mx-auto max-w-4xl px-4">
          <div className="grid gap-8 text-center md:grid-cols-4">
            <div>
              <div className="text-3xl font-bold text-primary">10K+</div>
              <div className="mt-1 text-sm text-muted-foreground">Creators</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">$50M+</div>
              <div className="mt-1 text-sm text-muted-foreground">Revenue Managed</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">1M+</div>
              <div className="mt-1 text-sm text-muted-foreground">Messages Automated</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">99.9%</div>
              <div className="mt-1 text-sm text-muted-foreground">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="font-serif text-2xl font-bold">Join the Divine Realm</h2>
          <p className="mx-auto mt-2 max-w-lg text-muted-foreground">
            Ready to transform your creator journey? Start your free trial today.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/auth/sign-up">Start Free Trial</Link>
            </Button>
            <Button variant="outline" asChild size="lg">
              <Link href="/contact">Contact Sales</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-6 px-4 text-sm text-muted-foreground">
          <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
          <Link href="/cookies" className="hover:text-primary">Cookie Policy</Link>
          <Link href="/contact" className="hover:text-primary">Contact Us</Link>
        </div>
      </footer>
    </div>
  )
}
