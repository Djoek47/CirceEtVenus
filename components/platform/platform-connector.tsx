'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Check, RefreshCw, AlertCircle, ExternalLink, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface PlatformConnection {
  id: string
  user_id: string
  platform: string
  platform_user_id: string
  platform_username: string | null
  is_connected: boolean
  last_sync_at: string | null
}

interface Platform {
  id: string
  name: string
  color: string
  gradient: string
  description: string
  dataTypes: string[]
}

// OnlyFans Logo
const OnlyFansLogo = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8zm0-14c-3.314 0-6 2.686-6 6s2.686 6 6 6 6-2.686 6-6-2.686-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0-6c-1.105 0-2 .895-2 2s.895 2 2 2 2-.895 2-2-.895-2-2-2z"/>
  </svg>
)

// Fansly Logo
const FanslyLogo = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm4.59-12.42L10 14.17l-2.59-2.58L6 13l4 4 8-8-1.41-1.42z"/>
  </svg>
)

// ManyVids Logo
const ManyVidsLogo = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
  </svg>
)

const PLATFORMS: Platform[] = [
  {
    id: 'onlyfans',
    name: 'OnlyFans',
    color: '#00AFF0',
    gradient: 'from-[#00AFF0] to-[#0090C0]',
    description: 'Connect your OnlyFans account to import fans, messages, and earnings',
    dataTypes: ['Subscribers', 'Messages', 'Earnings', 'Tips', 'PPV Sales'],
  },
  {
    id: 'fansly',
    name: 'Fansly',
    color: '#009FFF',
    gradient: 'from-[#009FFF] to-[#0066CC]',
    description: 'Import your Fansly subscribers and analytics',
    dataTypes: ['Subscribers', 'Messages', 'Earnings', 'Tips'],
  },
  {
    id: 'manyvids',
    name: 'ManyVids',
    color: '#E91E63',
    gradient: 'from-[#E91E63] to-[#C2185B]',
    description: 'Sync sales, fans, and video performance',
    dataTypes: ['Sales', 'Fans', 'Videos', 'Tips'],
  },
]

export function PlatformConnector() {
  const [connections, setConnections] = useState<PlatformConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // OnlyFans auth state
  const [onlyfansDialogOpen, setOnlyfansDialogOpen] = useState(false)
  const [onlyfansEmail, setOnlyfansEmail] = useState('')
  const [onlyfansPassword, setOnlyfansPassword] = useState('')
  const [onlyfansAttemptId, setOnlyfansAttemptId] = useState<string | null>(null)
  const [onlyfans2FACode, setOnlyfans2FACode] = useState('')
  const [onlyfansLoading, setOnlyfansLoading] = useState(false)
  const [onlyfansStatus, setOnlyfansStatus] = useState<string | null>(null)
  
  // Fansly auth state
  const [fanslyDialogOpen, setFanslyDialogOpen] = useState(false)
  const [fanslyUsername, setFanslyUsername] = useState('')
  const [fanslyPassword, setFanslyPassword] = useState('')
  const [fansly2FAToken, setFansly2FAToken] = useState<string | null>(null)
  const [fansly2FACode, setFansly2FACode] = useState('')
  const [fanslyLoading, setFanslyLoading] = useState(false)
  
  const supabase = createClient()

  const loadConnections = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', user.id)

    setConnections(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadConnections()
  }, [])

  const isConnected = (platformId: string) => {
    return connections.some(c => c.platform === platformId && c.is_connected)
  }

  const getConnection = (platformId: string) => {
    return connections.find(c => c.platform === platformId)
  }

  const getPlatformLogo = (platformId: string) => {
    switch (platformId) {
      case 'onlyfans': return <OnlyFansLogo />
      case 'fansly': return <FanslyLogo />
      case 'manyvids': return <ManyVidsLogo />
      default: return null
    }
  }

  // Handle OnlyFans login
  const handleOnlyfansLogin = async () => {
    setOnlyfansLoading(true)
    setError(null)
    setOnlyfansStatus(null)

    try {
      const response = await fetch('/api/onlyfans/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: onlyfansEmail,
          password: onlyfansPassword,
          attemptId: onlyfansAttemptId,
          twoFactorCode: onlyfans2FACode || undefined,
        }),
      })

      const data = await response.json()
      console.log('[v0] OnlyFans auth response:', data)

      // If we got an attemptId, start polling for status
      if (data.attemptId && !data.success && !data.requires_2fa) {
        setOnlyfansAttemptId(data.attemptId)
        setOnlyfansStatus(data.message || 'Processing authentication...')
        pollOnlyfansStatus(data.attemptId)
        return
      }

      // If 2FA required
      if (data.requires_2fa) {
        setOnlyfansAttemptId(data.attemptId)
        setOnlyfansStatus('2FA code required')
        setOnlyfansLoading(false)
        return
      }

      // If error
      if (data.error) {
        throw new Error(data.error)
      }

      // Success!
      if (data.success) {
        setOnlyfansDialogOpen(false)
        setOnlyfansEmail('')
        setOnlyfansPassword('')
        setOnlyfansAttemptId(null)
        setOnlyfans2FACode('')
        setSuccess('OnlyFans connected! Syncing your data...')
        await loadConnections()

        // Auto-sync data
        try {
          await fetch('/api/onlyfans/sync', { method: 'POST' })
          setSuccess('OnlyFans synced!')
          setTimeout(() => window.location.reload(), 1500)
        } catch {
          setSuccess('Connected! Click Sync to import your data.')
          setTimeout(() => setSuccess(null), 3000)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect OnlyFans')
    } finally {
      setOnlyfansLoading(false)
    }
  }

  // Poll for OnlyFans authentication status
  const pollOnlyfansStatus = async (attemptId: string) => {
    let pollCount = 0
    const maxPolls = 30

    const poll = async () => {
      pollCount++
      if (pollCount > maxPolls) {
        setOnlyfansLoading(false)
        setError('Authentication timed out. Please try again.')
        return
      }

      try {
        const response = await fetch('/api/onlyfans/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attemptId }),
        })

        const data = await response.json()

        if (data.requires_2fa) {
          setOnlyfansStatus('Please enter your 2FA code')
          setOnlyfansLoading(false)
          return
        }

        if (data.success && data.accountId) {
          setOnlyfansDialogOpen(false)
          setSuccess('OnlyFans connected! Syncing...')
          await loadConnections()
          try {
            await fetch('/api/onlyfans/sync', { method: 'POST' })
            setTimeout(() => window.location.reload(), 1500)
          } catch {
            setTimeout(() => setSuccess(null), 3000)
          }
          setOnlyfansLoading(false)
          return
        }

        if (data.error || data.status === 'failed') {
          setError(data.error || data.message || 'Authentication failed')
          setOnlyfansLoading(false)
          return
        }

        // Still pending, continue polling
        setOnlyfansStatus(data.message || 'Processing...')
        setTimeout(poll, 2000)
      } catch {
        setTimeout(poll, 2000)
      }
    }

    poll()
  }

  const handleConnectFansly = async () => {
    setFanslyLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/fansly/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: fanslyUsername,
          password: fanslyPassword,
          twoFactorToken: fansly2FAToken,
          twoFactorCode: fansly2FACode || undefined,
        }),
      })

      const data = await response.json()

      if (data.requires_2fa) {
        setFansly2FAToken(data.twoFactorToken)
        setFanslyLoading(false)
        return
      }

      if (data.success) {
        setFanslyDialogOpen(false)
        setFanslyUsername('')
        setFanslyPassword('')
        setFansly2FAToken(null)
        setFansly2FACode('')
        setSuccess('Fansly connected successfully!')
        await loadConnections()
        setTimeout(() => setSuccess(null), 5000)
      } else {
        throw new Error(data.error || 'Connection failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect Fansly')
    } finally {
      setFanslyLoading(false)
    }
  }

  const handleConnect = async (platformId: string) => {
    setError(null)
    
    if (platformId === 'onlyfans') {
      // Open OnlyFans dialog instead of SDK modal
      setOnlyfansEmail('')
      setOnlyfansPassword('')
      setOnlyfansAttemptId(null)
      setOnlyfans2FACode('')
      setOnlyfansStatus(null)
      setOnlyfansDialogOpen(true)
    } else if (platformId === 'fansly') {
      setFanslyDialogOpen(true)
    } else {
      setError(`${platformId} integration coming soon`)
    }
  }

  const handleSync = async (platformId: string) => {
    setSyncing(platformId)
    setError(null)

    try {
      const response = await fetch(`/api/${platformId}/sync`, { method: 'POST' })
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Sync failed')

      setSuccess(`${platformId} data synced successfully!`)
      await loadConnections()
      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(null)
    }
  }

  const handleDisconnect = async (platformId: string) => {
    setDisconnecting(platformId)
    setError(null)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error: dbError } = await supabase
        .from('platform_connections')
        .update({ is_connected: false })
        .eq('user_id', user.id)
        .eq('platform', platformId)

      if (dbError) throw dbError

      const platformName = PLATFORMS.find(p => p.id === platformId)?.name || platformId
      setSuccess(`${platformName} disconnected successfully`)
      await loadConnections()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect')
    } finally {
      setDisconnecting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <>
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

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {PLATFORMS.map((platform) => {
            const connected = isConnected(platform.id)
            const connection = getConnection(platform.id)
            
            return (
              <Card 
                key={platform.id} 
                className={`relative overflow-hidden border-2 transition-all duration-300 ${
                  connected 
                    ? 'border-green-500/50 bg-gradient-to-br from-green-500/5 to-transparent shadow-lg shadow-green-500/10' 
                    : 'border-border hover:border-primary/50 hover:shadow-lg'
                }`}
              >
                {/* Platform color accent bar */}
                <div 
                  className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${platform.gradient}`}
                />
                
                <CardHeader className="pb-4 pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div 
                        className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg transition-transform hover:scale-105"
                        style={{ 
                          background: `linear-gradient(135deg, ${platform.color}20, ${platform.color}10)`,
                          color: platform.color,
                          border: `1px solid ${platform.color}30`
                        }}
                      >
                        {getPlatformLogo(platform.id)}
                      </div>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {platform.name}
                          {connected && (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 shadow-sm">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </CardTitle>
                        {connection?.platform_username && (
                          <p className="text-sm text-muted-foreground">
                            @{connection.platform_username}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <CardDescription className="text-sm">
                    {platform.description}
                  </CardDescription>
                  
                  <div className="flex flex-wrap gap-1.5">
                    {platform.dataTypes.map((type) => (
                      <Badge 
                        key={type} 
                        variant="secondary" 
                        className="text-xs"
                        style={{ 
                          backgroundColor: `${platform.color}10`,
                          color: platform.color,
                          borderColor: `${platform.color}20`
                        }}
                      >
                        {type}
                      </Badge>
                    ))}
                  </div>

                  {connected ? (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleSync(platform.id)}
                        disabled={syncing === platform.id}
                      >
                        {syncing === platform.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        Sync Data
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDisconnect(platform.id)}
                        disabled={disconnecting === platform.id}
                        title="Disconnect"
                      >
                        {disconnecting === platform.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full shadow-lg transition-all hover:shadow-xl"
                      style={{ 
                        background: `linear-gradient(135deg, ${platform.color}, ${platform.color}CC)`,
                      }}
                      onClick={() => handleConnect(platform.id)}
                      disabled={connecting === platform.id}
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
                    <p className="text-xs text-muted-foreground text-center pt-1">
                      Last synced: {new Date(connection.last_sync_at).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

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
                  Enter your Fansly credentials to connect
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {!fansly2FAToken ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fansly-username">Email or Username</Label>
                  <Input
                    id="fansly-username"
                    type="email"
                    placeholder="your@email.com"
                    value={fanslyUsername}
                    onChange={(e) => setFanslyUsername(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fansly-password">Password</Label>
                  <Input
                    id="fansly-password"
                    type="password"
                    placeholder="Enter your password"
                    value={fanslyPassword}
                    onChange={(e) => setFanslyPassword(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="fansly-2fa">2FA Code</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Enter the verification code sent to your email or phone
                </p>
                <Input
                  id="fansly-2fa"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={fansly2FACode}
                  onChange={(e) => setFansly2FACode(e.target.value)}
                  maxLength={6}
                />
              </div>
            )}

            <Button
              className="w-full"
              style={{ background: 'linear-gradient(135deg, #009FFF, #0066CC)' }}
              onClick={handleConnectFansly}
              disabled={fanslyLoading || (!fansly2FAToken && (!fanslyUsername || !fanslyPassword)) || (!!fansly2FAToken && !fansly2FACode)}
            >
              {fanslyLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {fansly2FAToken ? 'Verify Code' : 'Connect Fansly'}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Your credentials are securely transmitted and never stored locally
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* OnlyFans Login Dialog */}
      <Dialog open={onlyfansDialogOpen} onOpenChange={setOnlyfansDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div 
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ backgroundColor: '#00AFF015', color: '#00AFF0' }}
              >
                <OnlyFansLogo />
              </div>
              <div>
                <DialogTitle>Connect OnlyFans</DialogTitle>
                <DialogDescription>
                  {onlyfansAttemptId && onlyfansStatus?.includes('2FA')
                    ? 'Enter your 2FA code to complete authentication'
                    : 'Sign in with your OnlyFans credentials'
                  }
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {onlyfansStatus && (
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-sm text-blue-400 flex items-center gap-2">
                {onlyfansLoading && <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />}
                {onlyfansStatus}
              </div>
            )}

            {!onlyfansAttemptId ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="onlyfans-email">Email</Label>
                  <Input
                    id="onlyfans-email"
                    type="email"
                    placeholder="your@email.com"
                    value={onlyfansEmail}
                    onChange={(e) => setOnlyfansEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="onlyfans-password">Password</Label>
                  <Input
                    id="onlyfans-password"
                    type="password"
                    placeholder="Enter your password"
                    value={onlyfansPassword}
                    onChange={(e) => setOnlyfansPassword(e.target.value)}
                  />
                </div>
              </>
            ) : onlyfansStatus?.includes('2FA') ? (
              <div className="space-y-2">
                <Label htmlFor="onlyfans-2fa">Verification Code</Label>
                <Input
                  id="onlyfans-2fa"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={onlyfans2FACode}
                  onChange={(e) => setOnlyfans2FACode(e.target.value)}
                  className="text-center text-lg tracking-widest"
                  maxLength={6}
                />
                <p className="text-xs text-muted-foreground">
                  Check your email or authenticator app for the code
                </p>
              </div>
            ) : null}

            <Button
              className="w-full"
              style={{ background: 'linear-gradient(135deg, #00AFF0, #0090C0)' }}
              onClick={handleOnlyfansLogin}
              disabled={onlyfansLoading || (!onlyfansAttemptId && (!onlyfansEmail || !onlyfansPassword))}
            >
              {onlyfansLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {onlyfansAttemptId && onlyfansStatus?.includes('2FA') 
                ? 'Verify & Connect' 
                : onlyfansAttemptId 
                  ? 'Processing...'
                  : 'Connect OnlyFans'
              }
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Your credentials are securely transmitted and never stored locally
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
