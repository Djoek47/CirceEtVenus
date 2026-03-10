'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Link2, Check, ArrowRight, Loader2, X } from 'lucide-react'
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
  gradient: string
  connected: boolean
  username?: string
}

// OnlyFans Logo - distinctive circular design
const OnlyFansLogo = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8zm0-14c-3.314 0-6 2.686-6 6s2.686 6 6 6 6-2.686 6-6-2.686-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0-6c-1.105 0-2 .895-2 2s.895 2 2 2 2-.895 2-2-.895-2-2-2z"/>
  </svg>
)

// Fansly Logo - checkmark in circle design
const FanslyLogo = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm4.59-12.42L10 14.17l-2.59-2.58L6 13l4 4 8-8-1.41-1.42z"/>
  </svg>
)

// ManyVids Logo - play button design  
const ManyVidsLogo = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
  </svg>
)

const PLATFORM_CONFIG = [
  { 
    id: 'onlyfans', 
    name: 'OnlyFans', 
    color: '#00AFF0',
    gradient: 'from-[#00AFF0] to-[#0090C0]',
    logo: OnlyFansLogo
  },
  { 
    id: 'fansly', 
    name: 'Fansly', 
    color: '#009FFF',
    gradient: 'from-[#009FFF] to-[#0066CC]',
    logo: FanslyLogo
  },
  { 
    id: 'manyvids', 
    name: 'ManyVids', 
    color: '#E91E63',
    gradient: 'from-[#E91E63] to-[#C2185B]',
    logo: ManyVidsLogo
  },
]

export function PlatformIntegrationWidget() {
  const [platforms, setPlatforms] = useState<Platform[]>(
    PLATFORM_CONFIG.map(p => ({ ...p, connected: false }))
  )
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Fansly account selection dialog state
  const [fanslyDialogOpen, setFanslyDialogOpen] = useState(false)
  const [fanslyAccounts, setFanslyAccounts] = useState<any[]>([])
  const [fanslyLoading, setFanslyLoading] = useState(false)
  const [selectedFanslyAccount, setSelectedFanslyAccount] = useState<string | null>(null)
  
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

  const handleConnectOnlyFans = async () => {
    setConnecting('onlyfans')
    setError(null)
    
    try {
      const response = await fetch('/api/onlyfans/auth')
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      if (!data.token) {
        throw new Error('No authentication token received')
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
  }

  // Fetch available Fansly accounts from the API
  const fetchFanslyAccounts = async () => {
    setFanslyLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/fansly/auth')
      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      if (data.accounts && data.accounts.length > 0) {
        setFanslyAccounts(data.accounts)
        setFanslyDialogOpen(true)
      } else {
        setError('No Fansly accounts found. Please connect an account in your Fansly API dashboard first.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Fansly accounts')
    } finally {
      setFanslyLoading(false)
    }
  }

  // Link selected Fansly account to user's profile
  const handleLinkFanslyAccount = async (account: any) => {
    setFanslyLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Save the connection to database
      await supabase
        .from('platform_connections')
        .upsert({
          user_id: user.id,
          platform: 'fansly',
          platform_user_id: account.accountId,
          platform_username: account.username || account.displayName || account.name,
          is_connected: true,
          access_token: account.accountId,
          last_sync_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,platform'
        })

      setFanslyDialogOpen(false)
      setSuccess('Fansly connected! Syncing your data...')
      await loadConnections()

      // Auto-sync data after connecting
      await fetch('/api/fansly/sync', { method: 'POST' })
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link Fansly account')
    } finally {
      setFanslyLoading(false)
    }
  }

  const handleConnect = async (platformId: string) => {
    if (platformId === 'onlyfans') {
      handleConnectOnlyFans()
    } else if (platformId === 'fansly') {
      fetchFanslyAccounts()
    } else {
      setError(`${platformId} integration coming soon`)
    }
  }

  const connectedCount = platforms.filter(p => p.connected).length

  const getPlatformLogo = (platformId: string) => {
    const config = PLATFORM_CONFIG.find(p => p.id === platformId)
    if (!config) return null
    const Logo = config.logo
    return <Logo />
  }

  return (
    <>
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-card via-card to-muted/20 shadow-xl">
        <CardHeader className="border-b border-border/50 bg-muted/30 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Link2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Creator Platforms</CardTitle>
                <CardDescription className="text-xs">
                  Connect to import your data
                </CardDescription>
              </div>
            </div>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : connectedCount > 0 ? (
              <Badge className="gap-1.5 bg-green-500/10 text-green-500 border-green-500/20">
                <Check className="h-3.5 w-3.5" />
                {connectedCount} Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Not Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="p-4 space-y-3">
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex items-center gap-2">
              <X className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-500 flex items-center gap-2">
              <Check className="h-4 w-4 flex-shrink-0" />
              {success}
            </div>
          )}
          
          {platforms.map((platform) => {
            const config = PLATFORM_CONFIG.find(p => p.id === platform.id)!
            
            return (
              <div 
                key={platform.id}
                className={`group relative flex items-center justify-between rounded-xl border-2 p-3.5 transition-all duration-300 ${
                  platform.connected 
                    ? 'border-green-500/30 bg-green-500/5' 
                    : 'border-border/50 hover:border-primary/30 hover:bg-muted/50'
                }`}
              >
                {/* Platform gradient accent */}
                <div 
                  className={`absolute left-0 top-0 h-full w-1 rounded-l-xl bg-gradient-to-b ${config.gradient}`}
                />
                
                <div className="flex items-center gap-3 pl-2">
                  {/* Logo with brand color background */}
                  <div 
                    className="flex h-11 w-11 items-center justify-center rounded-xl shadow-sm transition-transform group-hover:scale-105"
                    style={{ 
                      backgroundColor: `${config.color}15`,
                      color: config.color 
                    }}
                  >
                    {getPlatformLogo(platform.id)}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{platform.name}</span>
                      {platform.connected && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                    {platform.username ? (
                      <p className="text-xs text-muted-foreground">@{platform.username}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Click to connect</p>
                    )}
                  </div>
                </div>
                
                {platform.connected ? (
                  <Badge 
                    variant="secondary" 
                    className="bg-green-500/10 text-green-600 border-0 text-xs"
                  >
                    Synced
                  </Badge>
                ) : (
                  <Button 
                    size="sm" 
                    className="h-8 px-4 text-xs font-medium shadow-sm"
                    style={{ 
                      background: `linear-gradient(135deg, ${config.color}, ${config.color}CC)`,
                    }}
                    onClick={() => handleConnect(platform.id)}
                    disabled={connecting === platform.id}
                  >
                    {connecting === platform.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      'Connect'
                    )}
                  </Button>
                )}
              </div>
            )
          })}
          
          <Link href="/dashboard/settings?tab=integrations" className="block">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full mt-2 gap-1.5 text-primary hover:text-primary hover:bg-primary/5"
            >
              Manage All Platforms
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Fansly Account Selection Dialog */}
      <Dialog open={fanslyDialogOpen} onOpenChange={setFanslyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div 
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ backgroundColor: '#009FFF15', color: '#009FFF' }}
              >
                <FanslyLogo />
              </div>
              <div>
                <DialogTitle>Select Fansly Account</DialogTitle>
                <DialogDescription>
                  Choose which account to connect to your dashboard
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {fanslyAccounts.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-sm">Loading accounts...</p>
              </div>
            ) : (
              fanslyAccounts.map((account) => (
                <button
                  key={account.accountId}
                  onClick={() => handleLinkFanslyAccount(account)}
                  disabled={fanslyLoading}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-border hover:border-[#009FFF]/50 hover:bg-[#009FFF]/5 transition-all text-left"
                >
                  {account.avatar ? (
                    <img 
                      src={account.avatar} 
                      alt={account.displayName || account.name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-[#009FFF]/10 flex items-center justify-center text-[#009FFF] font-semibold">
                      {(account.displayName || account.name || 'F').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {account.displayName || account.name}
                    </p>
                    {account.username && (
                      <p className="text-xs text-muted-foreground">@{account.username}</p>
                    )}
                    {account.subscribersCount !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        {account.subscribersCount.toLocaleString()} subscribers
                      </p>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))
            )}

            <p className="text-xs text-muted-foreground text-center pt-2">
              Accounts are managed in your Fansly API dashboard
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
