'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Check, RefreshCw, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Platform Icons
const OnlyFansIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8zm0-14c-3.314 0-6 2.686-6 6s2.686 6 6 6 6-2.686 6-6-2.686-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0-6c-1.105 0-2 .895-2 2s.895 2 2 2 2-.895 2-2-.895-2-2-2z"/>
  </svg>
)

const ManyVidsIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 3.993L9 16z"/>
  </svg>
)



interface Platform {
  id: string
  name: string
  color: string
  description: string
  dataTypes: string[]
  icon: React.ReactNode
}

const PLATFORMS: Platform[] = [
  {
    id: 'onlyfans',
    name: 'OnlyFans',
    color: '#00AFF0',
    description: 'Import fans, messages, and earnings',
    dataTypes: ['Subscribers', 'Messages', 'Earnings', 'Tips'],
    icon: <OnlyFansIcon />,
  },
  {
    id: 'fansly',
    name: 'Fansly',
    color: '#1DA1F2',
    description: 'Import subscribers and analytics',
    dataTypes: ['Subscribers', 'Messages', 'Earnings'],
    icon: <OnlyFansIcon />,
  },
  {
    id: 'manyvids',
    name: 'ManyVids',
    color: '#E91E63',
    description: 'Sync sales, fans, and video performance',
    dataTypes: ['Sales', 'Fans', 'Videos', 'Tips'],
    icon: <ManyVidsIcon />,
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

  useEffect(() => {
    loadConnections()
  }, [])

  const loadConnections = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', user.id)

    setConnections(data || [])
    setLoading(false)
  }

  const isConnected = (platformId: string) => 
    connections.some(c => c.platform === platformId && c.is_connected)

  const getConnection = (platformId: string) => 
    connections.find(c => c.platform === platformId)

  const handleConnect = async (platformId: string) => {
    setConnecting(platformId)
    setError(null)
    
    if (platformId === 'onlyfans') {
      try {
        const response = await fetch('/api/onlyfans/auth')
        const data = await response.json()
        
        if (data.error) {
          throw new Error(data.error)
        }
        
        if (!data.token) {
          throw new Error('Failed to get authentication token')
        }

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
                  last_sync_at: new Date().toISOString(),
                }, { onConflict: 'user_id,platform' })
              
              setSuccess('OnlyFans connected successfully!')
              await loadConnections()
              setTimeout(() => setSuccess(null), 5000)
            }
            setConnecting(null)
          },
          onError: (err: { message?: string }) => {
            setError(err.message || 'Authentication failed')
            setConnecting(null)
          },
          onClose: () => setConnecting(null)
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Connection failed')
        setConnecting(null)
      }
    } else {
      setError(`${platformId} integration coming soon`)
      setConnecting(null)
    }
  }

  const handleSync = async (platformId: string) => {
    setSyncing(platformId)
    setError(null)
    
    try {
      const response = await fetch(`/api/${platformId}/sync`, { method: 'POST' })
      const data = await response.json()
      
      if (data.error) throw new Error(data.error)
      
      setSuccess(`${platformId} data synced successfully!`)
      await loadConnections()
      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(null)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-8"><RefreshCw className="h-6 w-6 animate-spin" /></div>
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
                connected ? 'border-green-500/50 bg-green-500/5' : 'border-border hover:border-primary/50'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${platform.color}20`, color: platform.color }}
                    >
                      {platform.icon}
                    </div>
                    <div>
                      <CardTitle className="text-base">{platform.name}</CardTitle>
                      {connected && connection?.platform_username && (
                        <p className="text-xs text-muted-foreground">@{connection.platform_username}</p>
                      )}
                    </div>
                  </div>
                  {connected && <Badge className="bg-green-500">Connected</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">{platform.description}</CardDescription>
                <div className="flex flex-wrap gap-1 mb-4">
                  {platform.dataTypes.map((type) => (
                    <Badge key={type} variant="secondary" className="text-xs">{type}</Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  {connected ? (
                    <Button 
                      size="sm" 
                      onClick={() => handleSync(platform.id)}
                      disabled={syncing === platform.id}
                      className="flex-1"
                    >
                      {syncing === platform.id ? (
                        <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Syncing...</>
                      ) : (
                        <><RefreshCw className="mr-2 h-4 w-4" /> Sync Now</>
                      )}
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      onClick={() => handleConnect(platform.id)}
                      disabled={connecting === platform.id}
                      className="flex-1"
                      style={{ backgroundColor: platform.color }}
                    >
                      {connecting === platform.id ? (
                        <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Connecting...</>
                      ) : (
                        <><ExternalLink className="mr-2 h-4 w-4" /> Connect</>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
