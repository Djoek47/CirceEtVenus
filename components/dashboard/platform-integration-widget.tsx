'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Link2, Check, ArrowRight, Loader2 } from 'lucide-react'
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

const PLATFORM_CONFIG = [
  { id: 'onlyfans', name: 'OnlyFans', color: '#00AFF0' },
  { id: 'fansly', name: 'Fansly', color: '#009FFF' },
  { id: 'mym', name: 'MYM', color: '#FF4D67' },
]

export function PlatformIntegrationWidget() {
  const [platforms, setPlatforms] = useState<Platform[]>(
    PLATFORM_CONFIG.map(p => ({ ...p, connected: false }))
  )
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
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

    loadConnections()
  }, [supabase])

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
          Link your accounts to unlock full platform features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {platforms.map((platform) => (
          <div 
            key={platform.id}
            className="flex items-center justify-between rounded-lg border border-border bg-card/50 p-2.5"
          >
            <div className="flex items-center gap-2.5">
              <div 
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${platform.color}20` }}
              >
                <span 
                  className="text-sm font-bold"
                  style={{ color: platform.color }}
                >
                  {platform.name.substring(0, 2).toUpperCase()}
                </span>
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
              <Link href="/dashboard/settings?tab=integrations">
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  Connect
                </Button>
              </Link>
            )}
          </div>
        ))}
        
        <Link href="/dashboard/settings?tab=integrations">
          <Button variant="ghost" size="sm" className="w-full gap-1 text-primary">
            Manage Integrations
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
