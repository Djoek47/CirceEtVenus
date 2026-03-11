'use client'

import { useState, useEffect, useRef } from 'react'
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
import {
  Loader2, Check, RefreshCw, AlertCircle, ExternalLink, X,
  Link2, ArrowRight, Mail, Lock, Shield, Unplug, Settings2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { NICHE_LABELS, NicheKey, BOUNDARY_NICHES } from '@/lib/niches'
import { cn } from '@/lib/utils'

interface PlatformConnection {
  id: string
  user_id: string
  platform: string
  platform_user_id: string
  platform_username: string | null
  is_connected: boolean
  last_sync_at: string | null
  niches?: string[] | null
}

interface Platform {
  id: string
  name: string
  color: string
  gradient: string
  description: string
  dataTypes: string[]
}

import Image from 'next/image'

// OnlyFans Logo
const OnlyFansLogo = () => (
  <img src="/onlyfans-logo.png" alt="OnlyFans" className="h-6 w-6" />
)

// Fansly Logo
const FanslyLogo = () => (
  <img src="/fansly-logo.png" alt="Fansly" className="h-6 w-6" />
)

// ManyVids Logo
const ManyVidsLogo = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
  </svg>
)

// X (Twitter) Logo
const XLogo = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)

// Instagram Logo
const InstagramLogo = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
)

// TikTok Logo
const TikTokLogo = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
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

function getPlatformLogo(platformId: string) {
  switch (platformId) {
    case 'onlyfans': return <OnlyFansLogo />
    case 'fansly': return <FanslyLogo />
    case 'manyvids': return <ManyVidsLogo />
    default: return null
  }
}

interface PlatformConnectorProps {
  compact?: boolean
}

export function PlatformConnector({ compact = false }: PlatformConnectorProps) {
  const [connections, setConnections] = useState<PlatformConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // OnlyFans: SDK modal only; overlay blocks app until user completes or cancels
  const [onlyfansSdkInProgress, setOnlyfansSdkInProgress] = useState(false)
  const onlyfansSdkSeenIframeRef = useRef(false)

  // Fansly auth state
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
    if (!user) { setLoading(false); return }

    const { data } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', user.id)

    setConnections(data || [])
    setLoading(false)
  }

  // Check OnlyFans API for connected accounts and sync to our database
  // This handles the ~45 second async auth process
  const checkAndSyncOnlyFans = async () => {
    try {
      const response = await fetch('/api/onlyfans/check-connection')
      const data = await response.json()
      
      if (data.connected && data.newlySynced) {
        // New account was synced from OnlyFans API - reload connections and sync data
        await loadConnections()
        setSuccess(`OnlyFans connected as @${data.username || 'user'}! Syncing data...`)
        
        // Automatically sync data from the newly connected account
        try {
          await fetch('/api/onlyfans/sync', { method: 'POST' })
          setSuccess(`OnlyFans synced! Your revenue data is now available.`)
        } catch {
          setSuccess(`OnlyFans connected! Click Sync to import your data.`)
        }
        
        setTimeout(() => setSuccess(null), 5000)
      }
    } catch {
      // Silent fail - this is a background check
    }
  }

  useEffect(() => {
    loadConnections()
    // Check for OnlyFans accounts that may have been connected asynchronously
    checkAndSyncOnlyFans()
  }, [])

  // If the user closes the OnlyFans SDK modal (presses X), the SDK should call onError.
  // As a fallback (some browser edge-cases), detect when the auth iframe appears then disappears
  // and cancel the in-progress state so the app is unblocked.
  useEffect(() => {
    if (!onlyfansSdkInProgress) {
      onlyfansSdkSeenIframeRef.current = false
      return
    }

    let cancelled = false
    const startedAt = Date.now()

    const tick = () => {
      if (cancelled) return

      const iframe = document.querySelector(
        'iframe[src*="onlyfansapi.com"], iframe[src*="onlyfansapi"], iframe[src*="app.onlyfansapi.com"]'
      )
      const hasIframe = !!iframe
      if (hasIframe) {
        onlyfansSdkSeenIframeRef.current = true
      }

      // If we previously saw the iframe and now it's gone, user likely closed (X)
      if (onlyfansSdkSeenIframeRef.current && !hasIframe) {
        void cancelOnlyfansSdkAuth('OnlyFans sign-in was cancelled')
        return
      }

      // If nothing showed up after a while, likely blocked
      if (!onlyfansSdkSeenIframeRef.current && Date.now() - startedAt > 10000) {
        void cancelOnlyfansSdkAuth('OnlyFans sign-in window did not open (popup blocked?). Please allow popups and try again.')
        return
      }
    }

    // poll quickly; the modal injects/removes DOM nodes
    const interval = window.setInterval(tick, 400)
    tick()
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [onlyfansSdkInProgress])

  const isConnected = (platformId: string) =>
    connections.some(c => c.platform === platformId && c.is_connected)

  const getConnection = (platformId: string) =>
    connections.find(c => c.platform === platformId)

  const toggleNiche = async (platformId: string, niche: NicheKey) => {
    const connection = getConnection(platformId)
    if (!connection) return
    const current = connection.niches || []
    const has = current.includes(niche)
    const next = has ? current.filter((n) => n !== niche) : [...current, niche]

    // Optimistic update
    setConnections((prev) =>
      prev.map((c) =>
        c.id === connection.id
          ? { ...c, niches: next }
          : c
      )
    )

    try {
      await fetch('/api/platforms/update-niches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: platformId, niches: next }),
      })
    } catch {
      // Fallback: reload connections if update fails
      loadConnections()
    }
  }

  // ── OnlyFans (SDK modal only; 2FA handled inside OnlyFansAPI.com modal) ───

  const cancelOnlyfansSdkAuth = async (reason?: string) => {
    try {
      await fetch('/api/onlyfans/cancel-auth', { method: 'POST' })
    } catch {
      // best-effort cleanup; still unblock UI
    } finally {
      if (reason) setError(reason)
      setOnlyfansSdkInProgress(false)
    }
  }

  const connectOnlyfansWithSdk = async () => {
    if (onlyfansSdkInProgress) return
    setOnlyfansSdkInProgress(true)
    setError(null)
    try {
      const res = await fetch('/api/onlyfans/auth')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to get session')
      }
      const { token } = await res.json()
      if (!token || typeof token !== 'string') throw new Error('No session token')

      const { startOnlyFansAuthentication } = await import('@onlyfansapi/auth')
      startOnlyFansAuthentication(token, {
        onSuccess: async (data: { accountId: string; username?: string }) => {
          try {
            const cbRes = await fetch('/api/onlyfans/callback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accountId: data.accountId, username: data.username }),
            })
            if (!cbRes.ok) {
              const err = await cbRes.json().catch(() => ({}))
              if (cbRes.status === 409 && err?.code === 'ONLYFANS_ACCOUNT_ALREADY_CONNECTED') {
                setError('This OnlyFans account is already connected to another Circe et Venus workspace. If you believe this is a mistake, please contact support.')
              } else {
                setError(err.error || err.message || 'Failed to save connection')
              }
              return
            }
            await loadConnections()
            setSuccess(`OnlyFans connected as @${data.username || 'user'}!`)
            try {
              await fetch('/api/onlyfans/sync', { method: 'POST' })
              setTimeout(() => window.location.reload(), 1000)
            } catch {
              setTimeout(() => setSuccess(null), 3000)
            }
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to save connection')
          } finally {
            setOnlyfansSdkInProgress(false)
          }
        },
        onError: (err: { message?: string; code?: string }) => {
          if (err?.code === 'AUTH_CANCELLED') {
            void cancelOnlyfansSdkAuth('OnlyFans sign-in was cancelled')
            return
          }
          void cancelOnlyfansSdkAuth(err?.message || 'OnlyFans sign-in was cancelled or failed')
        },
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start OnlyFans sign-in')
      setOnlyfansSdkInProgress(false)
    }
  }


  // ── Fansly ────────────────────────────────────────────────────────────────

  const openFanslyDialog = () => {
    setFanslyEmail('')
    setFanslyPassword('')
    setFansly2FAToken(null)
    setFansly2FACode('')
    setFanslyMaskedEmail(null)
    setFanslyDialogOpen(true)
  }

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

      if (data.requires_2fa) {
        setFansly2FAToken(data.twoFactorToken)
        setFanslyMaskedEmail(data.masked_email)
        setFanslyLoading(false)
        return
      }

      if (data.error) throw new Error(data.error)

      if (data.success) {
        setFanslyDialogOpen(false)
        setFanslyEmail('')
        setFanslyPassword('')
        setFansly2FAToken(null)
        setFansly2FACode('')
        await loadConnections()
        try {
          await fetch('/api/fansly/sync', { method: 'POST' })
          setTimeout(() => window.location.reload(), 1000)
        } catch {
          setTimeout(() => setSuccess(null), 3000)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect Fansly')
    } finally {
      setFanslyLoading(false)
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleConnect = (platformId: string) => {
    setError(null)
    if (platformId === 'onlyfans') connectOnlyfansWithSdk()
    else if (platformId === 'fansly') openFanslyDialog()
    else setError(`${platformId} integration coming soon`)
  }

  const handleSync = async (platformId: string) => {
    setSyncing(platformId)
    setError(null)
    try {
      const response = await fetch(`/api/${platformId}/sync`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) {
        // Handle OnlyFans-specific session expiry so we can log the user out cleanly
        if (platformId === 'onlyfans' && response.status === 401 && data?.code === 'ONLYFANS_SESSION_EXPIRED') {
          if (typeof window !== 'undefined') window.localStorage.removeItem('onlyfans_auth_attempt')
          setError(
            'Your OnlyFans password or session changed. To keep your data safe, we disconnected your OnlyFans account. Please reconnect (use a fresh login; you can try a different proxy if it was stuck).'
          )
          await loadConnections()
          return
        }
        throw new Error(data.error || 'Sync failed')
      }
      await loadConnections()
      setTimeout(() => window.location.reload(), 1000)
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
      // Call platform-specific disconnect API
      const response = await fetch(`/api/${platformId}/disconnect`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to disconnect')
      }

      await loadConnections()
      setSuccess('Platform disconnected successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect')
    } finally {
      setDisconnecting(null)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const connectedCount = PLATFORMS.filter(p => isConnected(p.id)).length

  const Alerts = () => (
    <>
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
    </>
  )

  // ── Compact layout (dashboard widget) ─────────────────────────────────────
  if (compact) {
    return (
      <>
        {onlyfansSdkInProgress && (
          <div
            className="fixed inset-0 z-[9998] flex items-center justify-center bg-background/80 backdrop-blur-sm"
            aria-hidden="false"
            style={{ pointerEvents: 'auto' }}
          >
            <div className="rounded-xl border border-border bg-card px-6 py-4 text-center shadow-xl">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary mb-3" />
              <p className="font-medium text-foreground">Complete sign-in in the OnlyFans window</p>
              <p className="text-sm text-muted-foreground mt-1">Secured by OnlyFansAPI.com</p>
              <p className="text-xs text-muted-foreground mt-2">This page is paused until you finish or close the sign-in window.</p>
            </div>
          </div>
        )}
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-card via-card to-muted/20 shadow-xl">
          <CardHeader className="border-b border-border/50 bg-muted/30 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Link2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Creator Platforms</CardTitle>
                  <CardDescription className="text-xs">Connect to import your data</CardDescription>
                </div>
              </div>
              {connectedCount > 0 ? (
                <Badge className="gap-1.5 bg-green-500/10 text-green-500 border-green-500/20">
                  <Check className="h-3.5 w-3.5" />
                  {connectedCount} Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">Not Connected</Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-3">
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex items-center gap-2">
                <X className="h-4 w-4 flex-shrink-0" />{error}
              </div>
            )}
            {success && (
              <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-500 flex items-center gap-2">
                <Check className="h-4 w-4 flex-shrink-0" />{success}
              </div>
            )}

            {PLATFORMS.map((platform) => {
              const connected = isConnected(platform.id)
              const connection = getConnection(platform.id)
              return (
                <div
                  key={platform.id}
                  className={`group relative flex items-center justify-between rounded-xl border-2 p-3.5 transition-all duration-300 ${
                    connected
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-border/50 hover:border-primary/30 hover:bg-muted/50'
                  }`}
                >
                  <div className={`absolute left-0 top-0 h-full w-1 rounded-l-xl bg-gradient-to-b ${platform.gradient}`} />

                  <div className="flex items-center gap-3 pl-2">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl shadow-sm transition-transform group-hover:scale-105"
                      style={{ backgroundColor: `${platform.color}15`, color: platform.color }}
                    >
                      {getPlatformLogo(platform.id)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{platform.name}</span>
                        {connected && (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                      {connection?.platform_username ? (
                        <p className="text-xs text-muted-foreground">@{connection.platform_username}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {connected ? 'Connected' : 'Click to connect'}
                        </p>
                      )}
                    </div>
                  </div>

                  {connected ? (
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1 rounded-lg border border-green-500/30 bg-green-500/10 px-2.5 py-1.5">
                        <Check className="h-3.5 w-3.5 text-green-500" />
                        <span className="text-xs font-medium text-green-600">Connected</span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            onClick={() => handleSync(platform.id)}
                            disabled={syncing === platform.id}
                            className="gap-2"
                          >
                            {syncing === platform.id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <RefreshCw className="h-4 w-4" />}
                            Sync data
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDisconnect(platform.id)}
                            disabled={disconnecting === platform.id}
                            className="gap-2 text-destructive focus:text-destructive"
                          >
                            {disconnecting === platform.id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Unplug className="h-4 w-4" />}
                            Disconnect
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="h-8 px-4 text-xs font-medium shadow-sm"
                      style={{ background: `linear-gradient(135deg, ${platform.color}, ${platform.color}CC)` }}
                      onClick={() => handleConnect(platform.id)}
                    >
                      Connect
                    </Button>
                  )}
                </div>
              )
            })}

            <Link href="/dashboard/settings?tab=integrations" className="block">
              <Button variant="ghost" size="sm" className="w-full mt-2 gap-1.5 text-primary hover:text-primary hover:bg-primary/5">
                Manage All Platforms
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <ConnectDialogs
          fanslyDialogOpen={fanslyDialogOpen} setFanslyDialogOpen={setFanslyDialogOpen}
          fanslyEmail={fanslyEmail} setFanslyEmail={setFanslyEmail}
          fanslyPassword={fanslyPassword} setFanslyPassword={setFanslyPassword}
          fansly2FAToken={fansly2FAToken}
          fansly2FACode={fansly2FACode} setFansly2FACode={setFansly2FACode}
          fanslyMaskedEmail={fanslyMaskedEmail}
          fanslyLoading={fanslyLoading}
          handleFanslyLogin={handleFanslyLogin}
        />
      </>
    )
  }

  // ── Full layout (settings page) ───────────────────────────────────────────
  return (
    <>
      {onlyfansSdkInProgress && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-background/80 backdrop-blur-sm"
          aria-hidden="false"
          style={{ pointerEvents: 'auto' }}
        >
          <div className="rounded-xl border border-border bg-card px-6 py-4 text-center shadow-xl">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary mb-3" />
            <p className="font-medium text-foreground">Complete sign-in in the OnlyFans window</p>
            <p className="text-sm text-muted-foreground mt-1">Secured by OnlyFansAPI.com</p>
            <p className="text-xs text-muted-foreground mt-2">This page is paused until you finish or close the sign-in window.</p>
          </div>
        </div>
      )}
      <div className="space-y-6">
        <Alerts />

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
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${platform.gradient}`} />

                <CardHeader className="pb-4 pt-6">
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
                      style={{
                        background: `linear-gradient(135deg, ${platform.color}20, ${platform.color}10)`,
                        color: platform.color,
                        border: `1px solid ${platform.color}30`,
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
                        <p className="text-sm text-muted-foreground">@{connection.platform_username}</p>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <CardDescription className="text-sm">{platform.description}</CardDescription>

                  <div className="flex flex-wrap gap-1.5">
                    {platform.dataTypes.map((type) => (
                      <Badge
                        key={type}
                        variant="secondary"
                        className="text-xs"
                        style={{
                          backgroundColor: `${platform.color}10`,
                          color: platform.color,
                          borderColor: `${platform.color}20`,
                        }}
                      >
                        {type}
                      </Badge>
                    ))}
                  </div>

                  {connected ? (
                    <div className="space-y-3 pt-2">
                      {/* Connected status bar */}
                      <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/8 px-3 py-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500">
                          <Check className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-green-600">Connected</p>
                          {connection?.platform_username && (
                            <p className="text-xs text-muted-foreground truncate">@{connection.platform_username}</p>
                          )}
                        </div>
                      </div>

                      {/* Niche & boundaries editor for creator platforms */}
                      {(platform.id === 'onlyfans' || platform.id === 'fansly') && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">
                            Content niche & boundaries
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {(Object.keys(NICHE_LABELS) as NicheKey[]).map((key) => {
                              const active = (connection?.niches || []).includes(key)
                              const isBoundary = BOUNDARY_NICHES.includes(key)
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => toggleNiche(platform.id, key)}
                                  className={cn(
                                    'rounded-full border px-2.5 py-0.5 text-[11px] transition-colors',
                                    active
                                      ? isBoundary
                                        ? 'border-amber-500 bg-amber-500/10 text-amber-600'
                                        : 'border-primary bg-primary/10 text-primary'
                                      : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-primary'
                                  )}
                                >
                                  {NICHE_LABELS[key]}
                                </button>
                              )
                            })}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            These tags help Circe & Venus tailor replies and respect your boundaries.
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-2"
                          onClick={() => handleSync(platform.id)}
                          disabled={syncing === platform.id}
                        >
                          {syncing === platform.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <RefreshCw className="h-3.5 w-3.5" />}
                          Sync Data
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive/60"
                          onClick={() => handleDisconnect(platform.id)}
                          disabled={disconnecting === platform.id}
                        >
                          {disconnecting === platform.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Unplug className="h-3.5 w-3.5" />}
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full shadow-lg transition-all hover:shadow-xl gap-2"
                      style={{ background: `linear-gradient(135deg, ${platform.color}, ${platform.color}CC)` }}
                      onClick={() => handleConnect(platform.id)}
                    >
                      <ExternalLink className="h-4 w-4" />
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

      <ConnectDialogs
        fanslyDialogOpen={fanslyDialogOpen} setFanslyDialogOpen={setFanslyDialogOpen}
        fanslyEmail={fanslyEmail} setFanslyEmail={setFanslyEmail}
        fanslyPassword={fanslyPassword} setFanslyPassword={setFanslyPassword}
        fansly2FAToken={fansly2FAToken}
        fansly2FACode={fansly2FACode} setFansly2FACode={setFansly2FACode}
        fanslyMaskedEmail={fanslyMaskedEmail}
        fanslyLoading={fanslyLoading}
        handleFanslyLogin={handleFanslyLogin}
      />
    </>
  )
}

// ── Shared Dialogs ─────────────────────────────────────────────────────────

interface ConnectDialogsProps {
  fanslyDialogOpen: boolean
  setFanslyDialogOpen: (v: boolean) => void
  fanslyEmail: string
  setFanslyEmail: (v: string) => void
  fanslyPassword: string
  setFanslyPassword: (v: string) => void
  fansly2FAToken: string | null
  fansly2FACode: string
  setFansly2FACode: (v: string) => void
  fanslyMaskedEmail: string | null
  fanslyLoading: boolean
  handleFanslyLogin: () => void
}

function ConnectDialogs({
  fanslyDialogOpen, setFanslyDialogOpen,
  fanslyEmail, setFanslyEmail,
  fanslyPassword, setFanslyPassword,
  fansly2FAToken,
  fansly2FACode, setFansly2FACode,
  fanslyMaskedEmail, fanslyLoading,
  handleFanslyLogin,
}: ConnectDialogsProps) {
  return (
    <>
      {/* Fansly Login Dialog */}
      <Dialog open={fanslyDialogOpen} onOpenChange={setFanslyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: '#009FFF15', color: '#009FFF' }}>
                <FanslyLogo />
              </div>
              <div>
                <DialogTitle>Connect Fansly</DialogTitle>
                <DialogDescription>
                  {fansly2FAToken
                    ? `Enter the code sent to ${fanslyMaskedEmail || 'your email'}`
                    : 'Sign in with your Fansly credentials'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!fansly2FAToken ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fl-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="fl-email" type="email" placeholder="your@email.com" value={fanslyEmail} onChange={e => setFanslyEmail(e.target.value)} className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fl-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="fl-password" type="password" placeholder="Enter your password" value={fanslyPassword} onChange={e => setFanslyPassword(e.target.value)} className="pl-10" />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="fl-2fa">Verification Code</Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="fl-2fa" type="text" placeholder="Enter 6-digit code" value={fansly2FACode} onChange={e => setFansly2FACode(e.target.value)} className="pl-10 text-center text-lg tracking-widest" maxLength={6} />
                </div>
                <p className="text-xs text-muted-foreground">Check your email or authenticator app for the code</p>
              </div>
            )}

            <Button
              className="w-full"
              style={{ background: 'linear-gradient(135deg, #009FFF, #0066CC)' }}
              onClick={handleFanslyLogin}
              disabled={fanslyLoading || (!fansly2FAToken && (!fanslyEmail || !fanslyPassword)) || (!!fansly2FAToken && fansly2FACode.length < 5)}
            >
              {fanslyLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {fansly2FAToken ? 'Verify & Connect' : 'Connect Fansly'}
            </Button>
            <p className="text-xs text-muted-foreground text-center">Your credentials are securely encrypted and never stored locally</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
