'use client'

import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/**
 * Syncs all connected platforms (same pattern as ConnectedPlatforms), then full page reload
 * so RSC-backed mentions, leaks, and widgets pick up fresh data.
 */
export function DashboardRefreshButton() {
  const [busy, setBusy] = useState(false)

  const handleRefresh = useCallback(async () => {
    if (busy) return
    setBusy(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('platform_connections')
          .select('platform')
          .eq('user_id', user.id)
          .eq('is_connected', true)
        const platforms = (data ?? [])
          .map((r: { platform?: string }) => r.platform)
          .filter((p): p is string => typeof p === 'string' && p.length > 0)
        await Promise.allSettled(platforms.map((p) => fetch(`/api/${p}/sync`, { method: 'POST' })))
      }
    } catch {
      // still reload so UI is not stuck
    } finally {
      window.location.reload()
    }
  }, [busy])

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="hidden gap-1.5 sm:inline-flex"
        title="Sync all connected platforms, then reload (mentions, leaks, dashboard)"
        disabled={busy}
        onClick={() => void handleRefresh()}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Refresh data
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-11 w-11 min-h-[44px] min-w-[44px] sm:hidden"
        title="Sync platforms and reload"
        disabled={busy}
        onClick={() => void handleRefresh()}
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
        <span className="sr-only">Refresh data</span>
      </Button>
    </>
  )
}
