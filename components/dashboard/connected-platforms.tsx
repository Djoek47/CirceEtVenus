'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const OnlyFansLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 4a6 6 0 1 1 0 12A6 6 0 0 1 12 6zm0 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/>
  </svg>
)

const FanslyLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.59 7.58L10 16.17l-2.59-2.58L6 15l4 4 8-8-1.41-1.42z"/>
  </svg>
)

const PLATFORM_META: Record<string, { color: string; label: string; Logo: React.FC<{ className?: string }> }> = {
  onlyfans: { color: '#00AFF0', label: 'OnlyFans', Logo: OnlyFansLogo },
  fansly:   { color: '#009FFF', label: 'Fansly',   Logo: FanslyLogo  },
}

interface Connection {
  platform: string
  platform_username?: string
  last_sync_at?: string
}

function formatLastSync(dateStr?: string) {
  if (!dateStr) return 'Never synced'
  const diffMins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (diffMins < 1)  return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const h = Math.floor(diffMins / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function ConnectedPlatforms() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [syncing, setSyncing] = useState<string | null>(null)
  const supabase = createClient()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadConnections = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('platform_connections')
      .select('platform, platform_username, last_sync_at')
      .eq('user_id', user.id)
      .eq('is_connected', true)
    if (data) setConnections(data)
  }, [supabase])

  // Sync a single platform then reload connections + refresh page data
  const handleSync = useCallback(async (platform: string) => {
    if (syncing) return
    setSyncing(platform)
    try {
      await fetch(`/api/${platform}/sync`, { method: 'POST' })
      await loadConnections()
      // Reload page to pick up new data in RSC
      window.location.reload()
    } catch {
      // silent
    } finally {
      setSyncing(null)
    }
  }, [syncing, loadConnections])

  // Load from Supabase on mount only
  useEffect(() => {
    loadConnections()
  }, [loadConnections])

  // Auto-refresh every 2 minutes — only calls sync API, no listAccounts
  useEffect(() => {
    if (connections.length === 0) return
    intervalRef.current = setInterval(() => {
      connections.forEach(conn => {
        fetch(`/api/${conn.platform}/sync`, { method: 'POST' }).catch(() => {})
      })
      loadConnections()
    }, 2 * 60 * 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [connections, loadConnections])

  if (connections.length === 0) return null

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-2">
        {connections.map((conn) => {
          const meta = PLATFORM_META[conn.platform]
          if (!meta) return null
          const { color, label, Logo } = meta
          const isSyncing = syncing === conn.platform

          return (
            <Tooltip key={conn.platform}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative h-9 w-9 rounded-full p-0 transition-all hover:scale-110"
                  style={{
                    backgroundColor: `${color}18`,
                    border: `1.5px solid ${color}40`,
                    color,
                  }}
                  onClick={() => handleSync(conn.platform)}
                  disabled={isSyncing}
                  aria-label={`Refresh ${label} data`}
                >
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Logo />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p className="font-semibold">{label}</p>
                {conn.platform_username && (
                  <p className="text-muted-foreground">@{conn.platform_username}</p>
                )}
                <p className="mt-1 text-muted-foreground">
                  Last synced: {formatLastSync(conn.last_sync_at)}
                </p>
                <p className="mt-0.5 font-medium text-primary">Click to refresh</p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
