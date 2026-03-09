'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ThemedLogo } from '@/components/themed-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Loader2, Sparkles, Moon, Sun, Star, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function SignUpPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || 
          `${window.location.origin}/dashboard`,
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/auth/sign-up-success')
  }

  const features = [
    { icon: Moon, text: 'Circe - Retention Enchantress AI', color: 'text-circe' },
    { icon: Sun, text: 'Venus - Growth Goddess AI', color: 'text-venus' },
    { icon: Star, text: 'Cosmic Content Calendar', color: 'text-primary' },
    { icon: Shield, text: 'Divine Leak Protection', color: 'text-circe' },
    { icon: Sparkles, text: 'Astrology-Powered Scheduling', color: 'text-venus' },
  ]

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left Side - Form */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-gold/10 via-venus/5 to-transparent" />
        </div>

        <Link 
          href="/" 
          className="absolute left-6 top-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <ThemedLogo
            width={100}
            height={100}
            className="rounded-full"
            priority
          />
          <h1 className="font-serif text-xl font-bold tracking-wider text-primary dark:text-circe-light">CIRCE ET VENUS</h1>
        </div>

        <Card className="w-full max-w-md border-primary/20 bg-card">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Join the Divine Realm</CardTitle>
            <CardDescription>
              Begin your 14-day celestial trial
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="fullName">Your Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="bg-input border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-input border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a sacred password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="bg-input border-border"
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters
                </p>
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 dark:bg-circe dark:hover:bg-circe/90 text-primary-foreground" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Awakening the goddesses...
                  </>
                ) : (
                  'Begin Your Journey'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already blessed by the goddesses?{' '}
              <Link href="/auth/login" className="font-medium text-primary hover:underline">
                Enter the realm
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Side - Features */}
      <div className="hidden flex-1 items-center justify-center border-l border-primary/10 bg-gradient-to-br from-background via-circe/5 to-venus/5 lg:flex">
        <div className="max-w-md px-8">
          <h2 className="font-serif text-3xl font-bold tracking-tight">
            Two Goddesses, <br />
            <span className="text-primary">One Divine Platform</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Circe enchants your fans to stay. Venus attracts new admirers. Together, they transform your creator business.
          </p>
          <ul className="mt-8 space-y-4">
            {features.map((feature) => (
              <li key={feature.text} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <feature.icon className={`h-4 w-4 ${feature.color}`} />
                </div>
                <span className="text-sm">{feature.text}</span>
              </li>
            ))}
          </ul>
          
          <div className="mt-8 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm italic text-muted-foreground">
              "Circe et Venus helped me double my retention and grow my following by 300% in just 3 months."
            </p>
            <p className="mt-2 text-xs font-medium text-primary">- Top 0.1% Creator</p>
          </div>
        </div>
      </div>
    </div>
  )
}
