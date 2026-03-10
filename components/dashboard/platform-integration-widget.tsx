'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Link2, Check, ArrowRight, Loader2, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface PlatformConnection {
  id: string
  platform: string
  platform_username: string
  is_connected: boolean
}

interface Platform {
  id: string
  name: string
  color: string
  connected: boolean
  username?: string
}

// OnlyFans Icon SVG
const OnlyFansIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8zm0-14c-3.314 0-6 2.686-6 6s2.686 6 6 6 6-2.686 6-6-2.686-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0-6c-1.105 0-2 .895-2 2s.895 2 2 2 2-.895 2-2-.895-2-2-2z"/>
  </svg>
)

const PLATFORM_CONFIG = [
  { id: 'onlyfans', name: 'OnlyFans', color: '#00AFF0' },
  { id: 'fansly', name: 'Fansly', color: '#009FFF' },
  { id: 'manyvids', name: 'ManyVids', color: '#E91E63' },
]

export function PlatformIntegrationWidget() {
  const [platforms, setPlatforms] = useState<Platform[]>(
    PLATFORM_CONFIG.map(p => ({ ...p, connected: false }))
  )
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const supabase = createClient()

  const loadConnections = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data: connections } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_connected', true)

    if (connections) {
      setPlatforms(prev => prev.map(p => {
        const conn = connections.find((c: PlatformConnection) => c.platform === p.id)
        return {
          ...p,
          connected: !!conn,
          username: conn?.platform_username
        }
      }))
    }
    setLoading(false)
  }

  useEffect(() => {
    loadConnections()
  }, [])

  const handleConnect = async (platformId: string) => {
    setConnecting(platformId)
    setError(null)
    
    if (platformId === 'onlyfans') {
      try {
        // Get client session token from our API
        const response = await fetch('/api/onlyfans/auth')
        const data = await response.json()
        
        if (data.error) {
          throw new Error(data.error)
        }
        
        if (!data.token) {
          throw new Error('No authentication token received')
        }

        // Dynamically import and use @onlyfansapi/auth
        const { startOnlyFansAuthentication } = await import('@onlyfansapi/auth')
        
        startOnlyFansAuthentication(data.token, {
          onSuccess: async (result: { accountId: string; username?: string }) => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              await supabase
                .from('platform_connections')
                .upsert({
                  user_id: user.id,
                  platform: 'onlyfans',
                  platform_user_id: result.accountId,
                  platform_username: result.username || 'Connected',
                  is_connected: true,
                  access_token: result.accountId,
                  last_sync_at: new Date().toISOString(),
                }, {
                  onConflict: 'user_id,platform'
                })
              
              setSuccess('OnlyFans connected!')
              await loadConnections()
              setTimeout(() => setSuccess(null), 3000)
            }
            setConnecting(null)
          },
          onError: (err: { message?: string }) => {
            setError(err.message || 'Authentication failed')
            setConnecting(null)
          },
          onClose: () => {
            setConnecting(null)
          }
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect')
        setConnecting(null)
      }
    } else {
      // Other platforms - show coming soon
      setError(`${platformId} integration coming soon`)
      setConnecting(null)
    }
  }

  const connectedCount = platforms.filter(p => p.connected).length
  const hasConnected = connectedCount > 0

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-5 w-5 text-primary" />
            Connect Platforms
          </CardTitle>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : hasConnected ? (
            <Badge variant="outline" className="gap-1 text-green-500 border-green-500/30">
              <Check className="h-3 w-3" />
              {connectedCount} Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Not Connected
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs">
          Link your accounts to see your revenue and fans
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <div className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-green-500/10 p-2 text-xs text-green-500">
            {success}
          </div>
        )}
        
        {platforms.map((platform) => (
          <div 
            key={platform.id}
            className="flex items-center justify-between rounded-lg border border-border bg-card/50 p-2.5"
          >
            <div className="flex items-center gap-2.5">
              <div 
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${platform.color}20`, color: platform.color }}
              >
                {platform.id === 'onlyfans' ? (
                  <OnlyFansIcon />
                ) : (
                  <span className="text-sm font-bold">
                    {platform.name.substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <span className="text-sm font-medium">{platform.name}</span>
                {platform.username && (
                  <p className="text-xs text-muted-foreground">@{platform.username}</p>
                )}
              </div>
            </div>
            {platform.connected ? (
              <Badge variant="secondary" className="gap-1 text-green-500">
                <Check className="h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Button 
                size="sm" 
                variant="outline" 
                className="h-7 text-xs"
                onClick={() => handleConnect(platform.id)}
                disabled={connecting === platform.id}
              >
                {connecting === platform.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  'Connect'
                )}
              </Button>
            )}
          </div>
        ))}
        
        <Link href="/dashboard/settings?tab=integrations">
          <Button variant="ghost" size="sm" className="w-full gap-1 text-primary">
            Manage All Platforms
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
