'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function MentionsHeader() {
  const supabase = createClient()
  const router = useRouter()
  const [isPro, setIsPro] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
          .from('subscriptions')
          .select('plan_id,plan')
          .eq('user_id', user.id)
          .maybeSingle()
        const planId = (data as any)?.plan_id || (data as any)?.plan
        if (planId && ['venus-pro', 'circe-elite', 'divine-duo'].includes(planId)) {
          setIsPro(true)
        }
      } catch {
        // ignore
      }
    }
    loadSubscription()
  }, [supabase])

  const handleRefreshVision = async () => {
    setLoading(true)
    try {
      await fetch('/api/social/scan-reputation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      router.refresh()
    } catch {
      // silent fail; existing data remains
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <span className="text-venus">Venus'</span> Watchful Gaze
        </h2>
        <p className="text-muted-foreground">
          The goddess tracks your reputation and sentiment across the realm
        </p>
      </div>
      <div className="flex items-center gap-2">
        {isPro && (
          <Badge variant="outline" className="text-[10px] border-venus/40 text-venus">
            Grok Pro
          </Badge>
        )}
        <Button
          variant="outline"
          size="sm"
          asChild
          className="border-venus/40 text-venus hover:bg-venus/10"
        >
          <Link href="/dashboard/ai-studio?ai=venus">
            Open Venus Pro
          </Link>
        </Button>
        <Button
          className="gap-2 bg-venus hover:bg-venus/90 text-background"
          onClick={handleRefreshVision}
          disabled={loading}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Vision
        </Button>
      </div>
    </div>
  )
}

