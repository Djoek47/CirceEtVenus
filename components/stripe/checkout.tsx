'use client'

import { useCallback, useState } from 'react'
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { startCheckoutSession } from '@/app/actions/stripe'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface CheckoutProps {
  productId: string
  buttonText?: string
  buttonVariant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive'
  buttonClassName?: string
  children?: React.ReactNode
}

export function Checkout({ 
  productId, 
  buttonText = 'Subscribe', 
  buttonVariant = 'default',
  buttonClassName,
  children 
}: CheckoutProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const fetchClientSecret = useCallback(async () => {
    setLoading(true)
    try {
      const secret = await startCheckoutSession(productId)
      return secret
    } finally {
      setLoading(false)
    }
  }, [productId])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant={buttonVariant} className={buttonClassName}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {buttonText}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Your Purchase</DialogTitle>
        </DialogHeader>
        <div id="checkout" className="min-h-[400px]">
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{ fetchClientSecret }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function CheckoutEmbed({ productId }: { productId: string }) {
  const fetchClientSecret = useCallback(
    () => startCheckoutSession(productId),
    [productId]
  )

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{ fetchClientSecret }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  )
}
