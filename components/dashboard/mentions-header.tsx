'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useScanIdentity } from '@/hooks/use-scan-identity'
import { ScanHandlePicker } from '@/components/dashboard/scan-handle-picker'

export function MentionsHeader() {
  const supabase = createClient()
  const router = useRouter()
  const [isPro, setIsPro] = useState(false)
  const [loading, setLoading] = useState(false)
  const [useAllHandles] = useState(false)
  const [selectedHandles, setSelectedHandles] = useState<Set<string>>(new Set())
  const { handles: identityHandles } = useScanIdentity()

  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase.from('subscriptions').select('plan_id').eq('user_id', user.id).maybeSingle()
        const planId = (data as any)?.plan_id
        if (planId && ['venus-pro', 'circe-elite', 'divine-duo'].includes(planId)) {
          setIsPro(true)
        }
      } catch {
        // ignore
      }
    }
    loadSubscription()
  }, [supabase])

  const toggleSelectedHandle = (value: string) => {
    setSelectedHandles((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('mentions_selected_handles', JSON.stringify(Array.from(next)))
      }
      return next
    })
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem('mentions_selected_handles')
      if (!raw) return
      const parsed = JSON.parse(raw) as string[]
      if (!Array.isArray(parsed)) return
      const allowed = new Set(identityHandles.map((h) => h.value))
      const picked = parsed.filter((h) => allowed.has(h))
      setSelectedHandles(new Set(picked))
    } catch {
      // ignore malformed storage
    }
  }, [identityHandles])

  const handleRefreshVision = async () => {
    if (identityHandles.length === 0 || selectedHandles.size === 0) {
      return
    }
    setLoading(true)
    try {
      const handlePayload = Array.from(selectedHandles)
      const res = await fetch('/api/social/scan-reputation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'both',
          ...(handlePayload ? { handles: handlePayload } : {}),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (isPro && data?.success && typeof data.inserted === 'number' && data.inserted > 0) {
        try {
          await fetch('/api/social/reputation-briefing', { method: 'POST' })
        } catch {
          // best-effort
        }
      }
      router.refresh()
    } catch {
      // silent fail; existing data remains
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <span className="text-venus">Venus&apos;</span> Watchful Gaze
          </h2>
          <p className="max-w-2xl text-muted-foreground">
            Monitors indexed mentions (search discovery), triages risk, and suggests replies you send yourself—no
            auto-posting.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
            <Link href="/dashboard/ai-studio/tools/venus-attraction">Open Venus Pro</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="border-venus/40 text-venus hover:bg-venus/10"
          >
            <Link href="/dashboard/settings?tab=integrations">Integrations</Link>
          </Button>
          <Button
            className="gap-2 bg-venus hover:bg-venus/90 text-background"
            onClick={handleRefreshVision}
            disabled={
              loading ||
              identityHandles.length === 0 || selectedHandles.size === 0
            }
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Vision
          </Button>
        </div>
      </div>

      {identityHandles.length > 1 && (
        <ScanHandlePicker
          handles={identityHandles}
          useAll={useAllHandles}
          onUseAllChange={() => undefined}
          selected={selectedHandles}
          onToggle={toggleSelectedHandle}
          idPrefix="mentions-header"
        />
      )}
    </div>
  )
}
