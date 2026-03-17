'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ThemedLogo } from '@/components/themed-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [hasSession, setHasSession] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)

    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold/10 via-circe/5 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
      </div>

      <Link
        href="/auth/login"
        className="absolute left-6 top-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to login
      </Link>

      <div className="mb-8 flex flex-col items-center gap-4">
        <ThemedLogo
          width={120}
          height={120}
          className="rounded-full"
          priority
        />
        <div className="text-center">
          <h1 className={cn(
            'font-serif text-2xl font-bold tracking-wider text-primary',
            mounted && 'dark:text-circe-light'
          )}>
            CIRCE ET VENUS
          </h1>
          <p className="text-xs text-muted-foreground">Divine Creator Management</p>
        </div>
      </div>

      <Card className="w-full max-w-md border-primary/20 bg-card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Set new password</CardTitle>
          <CardDescription>
            {success
              ? 'Your password has been updated.'
              : 'Enter your new password below.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasSession === false && !success ? (
            <div className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                This link may have expired or already been used. Request a new reset link.
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/auth/forgot-password">Request new link</Link>
              </Button>
              <Button variant="ghost" className="w-full" asChild>
                <Link href="/auth/login">Back to login</Link>
              </Button>
            </div>
          ) : success ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 rounded-lg bg-primary/10 p-4 text-primary">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span className="text-sm font-medium">Password updated</span>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Redirecting you to the dashboard...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="min-h-[44px] border-border bg-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="min-h-[44px] border-border bg-input"
                />
              </div>
              <Button
                type="submit"
                className={cn(
                  'w-full bg-primary text-primary-foreground hover:bg-primary/90',
                  mounted && 'dark:bg-circe dark:hover:bg-circe/90'
                )}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update password'
                )}
              </Button>
            </form>
          )}

          {!success && hasSession !== false && (
            <div className="mt-6 text-center text-sm text-muted-foreground">
              <Link href="/auth/login" className="font-medium text-primary hover:underline">
                Back to login
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
