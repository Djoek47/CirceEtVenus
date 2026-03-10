'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Check, RefreshCw, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { PlatformConnection } from '@/lib/types'

interface Platform {
  id: string
  name: string
  color: string
  description: string
  dataTypes: string[]
}

const PLATFORMS: Platform[] = [
  {
    id: 'onlyfans',
    name: 'OnlyFans',
    color: '#00AFF0',
    description: 'Connect your OnlyFans account to import fans, messages, and earnings',
    dataTypes: ['Subscribers', 'Messages', 'Earnings', 'Tips', 'PPV Sales'],
  },
  {
    id: 'fansly',
    name: 'Fansly',
    color: '#1DA1F2',
    description: 'Import your Fansly subscribers and analytics',
    dataTypes: ['Subscribers', 'Messages', 'Earnings'],
  },
  {
    id: 'mym',
    name: 'MYM',
    color: '#FF6B6B',
    description: 'Sync your MYM fans data and interactions',
    dataTypes: ['Fans', 'Messages', 'Revenue'],
  },
]

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

  const isConnected = (platformId: string) => 
    connections.some(c => c.platform === platformId && c.is_connected)

  const getConnection = (platformId: string) => 
    connections.find(c => c.platform === platformId)

  const handleConnect = async (platformId: string) => {
    setConnecting(platformId)
    setError(null)
    
    if (platformId === 'onlyfans') {
      // Open OnlyFans API console to connect account
      window.open('https://app.onlyfansapi.com', '_blank')
      setSuccess('Connect your account in the OnlyFans API console, then click "Sync Now" to import your data.')
      setConnecting(null)
    } else {
      setError(`${platformId} integration coming soon`)
      setConnecting(null)
    }
  }

  const handleSync = async (platformId: string) => {
    setSyncing(platformId)
    setError(null)
    
    try {
      const response = await fetch(`/api/${platformId}/sync`, {
        method: 'POST',
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Sync failed')
      }

      await loadConnections()
      setSuccess(`Successfully synced ${data.fans || 0} fans and ${data.messages || 0} messages`)
      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync data')
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
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
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
                      <span className="text-sm font-bold">
                        {platform.name.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-base">{platform.name}</CardTitle>
                      {connected && (
                        <p className="text-xs text-muted-foreground">
                          Last sync: {connection?.last_sync_at 
                            ? new Date(connection.last_sync_at).toLocaleDateString()
                            : 'Never'}
                        </p>
                      )}
                    </div>
                  </div>
                  {connected && (
                    <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                      Connected
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription>{platform.description}</CardDescription>
                
                <div className="flex flex-wrap gap-1">
                  {platform.dataTypes.map((type) => (
                    <Badge key={type} variant="secondary" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2">
                  {connected ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleSync(platform.id)}
                        disabled={syncing === platform.id}
                        className="flex-1"
                      >
                        {syncing === platform.id ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Syncing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Sync Now
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDisconnect(platform.id)}
                      >
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleConnect(platform.id)}
                      disabled={connecting === platform.id}
                      className="w-full"
                      style={{ backgroundColor: platform.color }}
                    >
                      {connecting === platform.id ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Connect {platform.name}
                        </>
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
