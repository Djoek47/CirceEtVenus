'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Link2, 
  Loader2, 
  RefreshCw, 
  Check, 
  AlertCircle,
  ExternalLink,
  Unlink
} from 'lucide-react'

// OnlyFans Logo SVG Component
function OnlyFansIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8zm0-14c-3.314 0-6 2.686-6 6s2.686 6 6 6 6-2.686 6-6-2.686-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0-6c-1.105 0-2 .895-2 2s.895 2 2 2 2-.895 2-2-.895-2-2-2z"/>
    </svg>
  )
}

interface Platform {
  id: string
  name: string
  color: string
  description: string
  dataTypes: string[]
  icon?: React.ReactNode
}

const PLATFORMS: Platform[] = [
  {
    id: 'onlyfans',
    name: 'OnlyFans',
    color: '#00AFF0',
    description: 'Connect your OnlyFans account to import fans, messages, and earnings',
    dataTypes: ['Subscribers', 'Messages', 'Earnings', 'Tips', 'PPV Sales'],
    icon: <OnlyFansIcon />,
  },
  {
    id: 'fansly',
    name: 'Fansly',
    color: '#1DA1F2',
    description: 'Sync your Fansly subscribers and content analytics',
    dataTypes: ['Subscribers', 'Messages', 'Earnings'],
  },
  {
    id: 'mym',
    name: 'MYM',
    color: '#FF69B4',
    description: 'Import your MYM fans and engagement data',
    dataTypes: ['Fans', 'Messages', 'Revenue'],
  },
]

interface PlatformConnection {
  id: string
  platform: string
  platform_username: string | null
  is_connected: boolean
  last_sync_at: string | null
}

export function PlatformConnector() {
  const [connections, setConnections] = useState<PlatformConnection[]>([])
  const [connecting, setConnecting] = useState<string | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const loadConnections = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', user.id)

    setConnections(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadConnections()
  }, [loadConnections])

  const isConnected = (platformId: string) => {
    return connections.some(c => c.platform === platformId && c.is_connected)
  }

  const getConnection = (platformId: string) => {
    return connections.find(c => c.platform === platformId)
  }

  const handleConnect = async (platformId: string) => {
    setConnecting(platformId)
    setError(null)

    try {
      if (platformId === 'onlyfans') {
        // Open OnlyFans API Console to connect account
        // Users connect their OF account there, then come back to sync
        window.open('https://app.onlyfansapi.com/accounts', '_blank', 'width=800,height=700')
        setSuccess('Connect your OnlyFans account in the console, then return here and click "Sync Now" to import your data.')
        
        // Create a pending connection record
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('platform_connections').upsert({
            user_id: user.id,
            platform: platformId,
            is_connected: false,
            platform_username: 'Pending...',
          }, { onConflict: 'user_id,platform' })
          await loadConnections()
        }
      } else {
        setError(`${PLATFORMS.find(p => p.id === platformId)?.name} integration coming soon!`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect')
    } finally {
      setConnecting(null)
    }
  }

  const handleSync = async (platformId: string) => {
    setSyncing(platformId)
    setError(null)

    try {
      const response = await fetch('/api/onlyfans/sync', { method: 'POST' })
      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      // Update connection status
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('platform_connections').upsert({
          user_id: user.id,
          platform: platformId,
          is_connected: true,
          last_sync_at: new Date().toISOString(),
        }, { onConflict: 'user_id,platform' })
      }

      await loadConnections()
      
      const syncedInfo = []
      if (data.synced?.fans) syncedInfo.push(`${data.synced.fans} fans`)
      if (data.synced?.revenue) syncedInfo.push(`$${data.synced.revenue.toLocaleString()} revenue`)
      if (data.synced?.messages) syncedInfo.push(`${data.synced.messages} messages`)
      
      setSuccess(`Synced: ${syncedInfo.join(', ') || 'Data imported successfully'}`)
      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed. Make sure you completed authentication.')
    } finally {
      setSyncing(null)
    }
  }

  const handleDisconnect = async (platformId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('platform_connections')
      .delete()
      .eq('user_id', user.id)
      .eq('platform', platformId)

    await loadConnections()
    setSuccess('Platform disconnected')
    setTimeout(() => setSuccess(null), 3000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500/50 bg-green-500/10">
          <Check className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-500">{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PLATFORMS.map((platform) => {
          const connected = isConnected(platform.id)
          const connection = getConnection(platform.id)

          return (
            <Card
              key={platform.id}
              className={`border-2 transition-colors ${
                connected
                  ? 'border-green-500/50 bg-green-500/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${platform.color}20`, color: platform.color }}
                    >
                      {platform.icon || (
                        <span className="text-sm font-bold">
                          {platform.name.substring(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base">{platform.name}</CardTitle>
                      {connected && connection?.platform_username && (
                        <p className="text-xs text-muted-foreground">
                          @{connection.platform_username}
                        </p>
                      )}
                    </div>
                  </div>
                  {connected && (
                    <Badge variant="outline" className="border-green-500/50 text-green-500">
                      <Check className="mr-1 h-3 w-3" />
                      Connected
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="text-sm">
                  {platform.description}
                </CardDescription>

                <div className="flex flex-wrap gap-1">
                  {platform.dataTypes.map((type) => (
                    <Badge key={type} variant="secondary" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>

                {connected ? (
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      variant="outline"
                      onClick={() => handleSync(platform.id)}
                      disabled={syncing === platform.id}
                    >
                      {syncing === platform.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Sync Now
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDisconnect(platform.id)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Unlink className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleConnect(platform.id)}
                    disabled={connecting === platform.id}
                    style={{ backgroundColor: platform.color }}
                  >
                    {connecting === platform.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="mr-2 h-4 w-4" />
                    )}
                    Connect {platform.name}
                  </Button>
                )}

                {connection?.last_sync_at && (
                  <p className="text-xs text-muted-foreground">
                    Last synced: {new Date(connection.last_sync_at).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
