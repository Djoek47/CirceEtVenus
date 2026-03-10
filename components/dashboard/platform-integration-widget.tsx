'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Link2, Check, ArrowRight, Loader2, X, RefreshCw, Mail, Lock, Shield } from 'lucide-react'
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
  const [syncing, setSyncing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Fansly login dialog state
  const [fanslyDialogOpen, setFanslyDialogOpen] = useState(false)
  const [fanslyEmail, setFanslyEmail] = useState('')
  const [fanslyPassword, setFanslyPassword] = useState('')
  const [fansly2FAToken, setFansly2FAToken] = useState<string | null>(null)
  const [fansly2FACode, setFansly2FACode] = useState('')
  const [fanslyMaskedEmail, setFanslyMaskedEmail] = useState<string | null>(null)
  const [fanslyLoading, setFanslyLoading] = useState(false)
  
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
    
    // Check URL params for callback results
    const params = new URLSearchParams(window.location.search)
    const connected = params.get('connected')
    const errorParam = params.get('error')
    
    if (connected === 'onlyfans') {
      setSuccess('OnlyFans connected successfully!')
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
      // Reload connections
      loadConnections()
    }
    
    if (errorParam) {
      setError(decodeURIComponent(errorParam))
      window.history.replaceState({}, '', window.location.pathname)
    }
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
      
      // Store user ID for the callback
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id
      
      startOnlyFansAuthentication(data.token, {
        onSuccess: async (result: { accountId: string; username?: string }) => {
          console.log('[v0] OnlyFans onSuccess called:', result)
          
          if (userId) {
            // Save connection to database
            const { error: dbError } = await supabase
              .from('platform_connections')
              .upsert({
                user_id: userId,
                platform: 'onlyfans',
                platform_user_id: result.accountId,
                platform_username: result.username || 'Connected',
                is_connected: true,
                access_token: result.accountId,
                last_sync_at: new Date().toISOString(),
              }, {
                onConflict: 'user_id,platform'
              })
            
            if (dbError) {
              console.error('[v0] Database error:', dbError)
              setError('Failed to save connection')
              setConnecting(null)
              return
            }
            
            setSuccess('OnlyFans connected! Syncing your data...')
            await loadConnections()
            
            // Auto-sync data after connecting
            try {
              await fetch('/api/onlyfans/sync', { method: 'POST' })
              setSuccess('OnlyFans synced! Refreshing...')
              setTimeout(() => window.location.reload(), 1500)
            } catch {
              setSuccess('Connected! Click Sync to import your data.')
              setTimeout(() => setSuccess(null), 3000)
            }
          }
          setConnecting(null)
        },
        onError: (err: { message?: string }) => {
          console.error('[v0] OnlyFans onError:', err)
          setError(err.message || 'Authentication failed')
          setConnecting(null)
        },
        onClose: () => {
          console.log('[v0] OnlyFans modal closed')
          // Check if connection was successful by reloading connections
          loadConnections().then(() => {
            const isNowConnected = platforms.find(p => p.id === 'onlyfans')?.connected
            if (isNowConnected) {
              setSuccess('OnlyFans connected!')
              setTimeout(() => window.location.reload(), 1500)
            }
          })
          setConnecting(null)
        }
      })
    } catch (err) {
      console.error('[v0] OnlyFans connection error:', err)
      setError(err instanceof Error ? err.message : 'Failed to connect')
      setConnecting(null)
    }
  }

  // Open Fansly login dialog
  const openFanslyDialog = () => {
    setFanslyEmail('')
    setFanslyPassword('')
    setFansly2FAToken(null)
    setFansly2FACode('')
    setFanslyMaskedEmail(null)
    setFanslyDialogOpen(true)
  }

  // Handle Fansly login
  const handleFanslyLogin = async () => {
    setFanslyLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/fansly/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: fanslyEmail,
          password: fanslyPassword,
          twoFactorToken: fansly2FAToken,
          twoFactorCode: fansly2FACode || undefined,
        }),
      })

      const data = await response.json()

      // If 2FA required
      if (data.requires_2fa) {
        setFansly2FAToken(data.twoFactorToken)
        setFanslyMaskedEmail(data.masked_email)
        setFanslyLoading(false)
        return
      }

      // If error
      if (data.error) {
        throw new Error(data.error)
      }

      // Success!
      if (data.success) {
        setFanslyDialogOpen(false)
        setFanslyEmail('')
        setFanslyPassword('')
        setFansly2FAToken(null)
        setFansly2FACode('')
        setSuccess('Fansly connected! Syncing your data...')
        await loadConnections()

        // Auto-sync data
        try {
          await fetch('/api/fansly/sync', { method: 'POST' })
          setSuccess('Fansly synced! Refreshing...')
          setTimeout(() => window.location.reload(), 1500)
        } catch {
          setSuccess('Connected! Click Sync to import your data.')
          setTimeout(() => setSuccess(null), 3000)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect Fansly')
    } finally {
      setFanslyLoading(false)
    }
  }

  const handleConnect = async (platformId: string) => {
    if (platformId === 'onlyfans') {
      handleConnectOnlyFans()
    } else if (platformId === 'fansly') {
      openFanslyDialog()
    } else {
      setError(`${platformId} integration coming soon`)
    }
  }

  const handleSync = async (platformId: string) => {
    setSyncing(platformId)
    setError(null)

    try {
      const endpoint = platformId === 'onlyfans' ? '/api/onlyfans/sync' : `/api/${platformId}/sync`
      const response = await fetch(endpoint, { method: 'POST' })
      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setSuccess(`${platformId.charAt(0).toUpperCase() + platformId.slice(1)} synced! Refreshing...`)
      
      // Refresh the page to show updated data
      setTimeout(() => window.location.reload(), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync')
    } finally {
      setSyncing(null)
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
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 text-xs gap-1.5 border-green-500/30 text-green-600 hover:bg-green-500/10"
                    onClick={() => handleSync(platform.id)}
                    disabled={syncing === platform.id}
                    title="Sync data"
                  >
                    {syncing === platform.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    Sync
                  </Button>
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

      {/* Fansly Login Dialog */}
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
                <DialogTitle>Connect Fansly</DialogTitle>
                <DialogDescription>
                  {fansly2FAToken 
                    ? `Enter the code sent to ${fanslyMaskedEmail || 'your email'}`
                    : 'Sign in with your Fansly credentials'
                  }
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {!fansly2FAToken ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fansly-email" className="text-sm font-medium">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fansly-email"
                      type="email"
                      placeholder="your@email.com"
                      value={fanslyEmail}
                      onChange={(e) => setFanslyEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fansly-password" className="text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fansly-password"
                      type="password"
                      placeholder="Enter your password"
                      value={fanslyPassword}
                      onChange={(e) => setFanslyPassword(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="fansly-2fa" className="text-sm font-medium">
                  Verification Code
                </Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fansly-2fa"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={fansly2FACode}
                    onChange={(e) => setFansly2FACode(e.target.value)}
                    className="pl-10 text-center text-lg tracking-widest"
                    maxLength={6}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Check your email or authenticator app for the code
                </p>
              </div>
            )}

            <Button
              className="w-full"
              style={{ 
                background: 'linear-gradient(135deg, #009FFF, #0066CC)',
              }}
              onClick={handleFanslyLogin}
              disabled={fanslyLoading || (!fansly2FAToken && (!fanslyEmail || !fanslyPassword)) || (fansly2FAToken && fansly2FACode.length < 5)}
            >
              {fanslyLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {fansly2FAToken ? 'Verify & Connect' : 'Connect Fansly'}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Your credentials are securely encrypted and never stored locally
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
