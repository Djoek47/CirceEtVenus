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

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
)

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
  </svg>
)

const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
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
  {
    id: 'instagram',
    name: 'Instagram',
    color: '#E4405F',
    description: 'Track followers and engagement',
    dataTypes: ['Followers', 'Posts', 'Engagement'],
    icon: <InstagramIcon />,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    color: '#000000',
    description: 'Monitor views and follower growth',
    dataTypes: ['Followers', 'Views', 'Engagement'],
    icon: <TikTokIcon />,
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    color: '#000000',
    description: 'Track followers and tweet performance',
    dataTypes: ['Followers', 'Tweets', 'Engagement'],
    icon: <TwitterIcon />,
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
