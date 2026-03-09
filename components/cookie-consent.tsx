'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Cookie, X } from 'lucide-react'

export function CookieConsent() {
  const [show, setShow] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const consent = localStorage.getItem('cookie-consent')
    if (!consent) {
      // Delay showing banner slightly
      setTimeout(() => setShow(true), 1000)
    }
  }, [])

  function handleAccept() {
    localStorage.setItem('cookie-consent', 'accepted')
    setShow(false)
  }

  function handleDecline() {
    localStorage.setItem('cookie-consent', 'declined')
    setShow(false)
  }

  if (!mounted || !show) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="mx-auto max-w-4xl p-4">
        <div className="rounded-lg border border-border bg-card/95 p-4 shadow-lg backdrop-blur-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Cookie className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">We use cookies</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  We use cookies to enhance your experience. By continuing, you agree to our{' '}
                  <Link href="/cookies" className="text-primary hover:underline">
                    Cookie Policy
                  </Link>
                  .
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:flex-shrink-0">
              <Button variant="outline" size="sm" onClick={handleDecline}>
                Decline
              </Button>
              <Button size="sm" onClick={handleAccept}>
                Accept All
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleDecline}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
