'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, ArrowRight, Star } from 'lucide-react'
import { ThemedLogo } from '@/components/themed-logo'

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-circe/5 to-transparent" />
      </div>

      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <ThemedLogo
          width={100}
          height={100}
          className="rounded-full"
          priority
        />
        <h1 className="font-serif text-xl font-bold tracking-wider text-primary">CIRCE ET VENUS</h1>
      </div>

      <Card className="w-full max-w-md border-primary/20 bg-card text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Star className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">The Stars Align</CardTitle>
          <CardDescription>
            Check your email to complete the divine ritual
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            We have sent a celestial message to verify your identity. Click the sacred link to enter the realm of Circe et Venus.
          </p>
          
          <div className="flex items-center justify-center gap-2 py-4">
            <Mail className="h-5 w-5 text-primary" />
            <span className="text-sm text-primary">Awaiting your confirmation</span>
          </div>
          
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="text-xs text-muted-foreground">
              {"The message may hide in your spam realm."}{' '}
              <Link href="/auth/sign-up" className="text-primary hover:underline">
                Request another scroll
              </Link>
            </p>
          </div>

          <Link href="/auth/login">
            <Button variant="outline" className="w-full gap-2 border-primary/30 hover:bg-primary/10">
              Enter the Realm <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
