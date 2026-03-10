'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Platform logos
const OnlyFansLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={cn("h-5 w-5", className)} fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8zm0-14c-3.314 0-6 2.686-6 6s2.686 6 6 6 6-2.686 6-6-2.686-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0-6c-1.105 0-2 .895-2 2s.895 2 2 2 2-.895 2-2-.895-2-2-2z"/>
  </svg>
)

const FanslyLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={cn("h-5 w-5", className)} fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm4.59-12.42L10 14.17l-2.59-2.58L6 13l4 4 8-8-1.41-1.42z"/>
  </svg>
)

interface PlatformConnection {
  platform: string
  platform_username?: string
  last_sync_at?: string
}

interface ConnectedPlatformsProps {
  initialConnections?: PlatformConnection[]
}

export function ConnectedPlatforms({ initialConnections = [] }: ConnectedPlatformsProps) {
  const [connections, setConnections] = useState<PlatformConnection[]>(initialConnections)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const supabase = createClient()

  // Load connections
  const loadConnections = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('platform_connections')
      .select('platform, platform_username, last_sync_at')
      .eq('user_id', user.id)
      .eq('is_connected', true)

    if (data) {
      setConnections(data)
    }
  }, [supabase])

  // Sync platform data
  const handleSync = async (platform: string) => {
    setSyncing(platform)
    try {
      const response = await fetch(`/api/${platform}/sync`, { method: 'POST' })
      if (response.ok) {
        setLastRefresh(new Date())
        await loadConnections()
        // Refresh the page to update stats
        window.location.reload()
      }
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      setSyncing(null)
    }
  }

  // Sync all platforms
  const handleSyncAll = async () => {
    for (const conn of connections) {
      await handleSync(conn.platform)
    }
  }

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(async () => {
      // Check for new connections and sync data
      await loadConnections()
      
      // Auto-sync all connected platforms
      for (const conn of connections) {
        try {
          await fetch(`/api/${conn.platform}/sync`, { method: 'POST' })
        } catch {
          // Silent fail for background sync
        }
      }
      
      setLastRefresh(new Date())
    }, 2 * 60 * 1000) // 2 minutes

    return () => clearInterval(interval)
  }, [connections, loadConnections])

  // Initial check for new connections on mount
  useEffect(() => {
    const checkConnections = async () => {
      // Check OnlyFans API for connected accounts
      try {
        await fetch('/api/onlyfans/check-connection')
        await loadConnections()
      } catch {
        // Silent fail
      }
    }
    checkConnections()
  }, [loadConnections])

  if (connections.length === 0) return null

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'onlyfans': return '#00AFF0'
      case 'fansly': return '#009FFF'
      default: return '#888'
    }
  }

  const getPlatformLogo = (platform: string) => {
    switch (platform) {
      case 'onlyfans': return OnlyFansLogo
      case 'fansly': return FanslyLogo
      default: return null
    }
  }

  const formatLastSync = (dateStr?: string) => {
    if (!dateStr) return 'Never synced'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return `${Math.floor(diffHours / 24)}d ago`
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground mr-1">Connected:</span>
        {connections.map((conn) => {
          const Logo = getPlatformLogo(conn.platform)
          const color = getPlatformColor(conn.platform)
          const isSyncing = syncing === conn.platform
          
          return (
            <Tooltip key={conn.platform}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-full hover:bg-accent transition-all"
                  style={{ 
                    backgroundColor: `${color}15`,
                    border: `1px solid ${color}30`,
                  }}
                  onClick={() => handleSync(conn.platform)}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" style={{ color }} />
                  ) : Logo ? (
                    <Logo className="h-4 w-4" />
                  ) : null}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <div className="font-medium capitalize">{conn.platform}</div>
                {conn.platform_username && (
                  <div className="text-muted-foreground">@{conn.platform_username}</div>
                )}
                <div className="text-muted-foreground mt-1">
                  Last sync: {formatLastSync(conn.last_sync_at)}
                </div>
                <div className="text-primary mt-1">Click to refresh</div>
              </TooltipContent>
            </Tooltip>
          )
        })}
        
        {connections.length > 1 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full"
                onClick={handleSyncAll}
                disabled={syncing !== null}
              >
                <RefreshCw className={cn(
                  "h-3.5 w-3.5 text-muted-foreground",
                  syncing && "animate-spin"
                )} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Refresh all platforms
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}
