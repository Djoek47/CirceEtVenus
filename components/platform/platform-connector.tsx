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

  // OnlyFans auth state
  const [onlyfansDialogOpen, setOnlyfansDialogOpen] = useState(false)
  const [onlyfansEmail, setOnlyfansEmail] = useState('')
  const [onlyfansPassword, setOnlyfansPassword] = useState('')
  const [onlyfansAttemptId, setOnlyfansAttemptId] = useState<string | null>(null)
  const [onlyfans2FACode, setOnlyfans2FACode] = useState('')
  const [onlyfansLoading, setOnlyfansLoading] = useState(false)
  const [onlyfansStatus, setOnlyfansStatus] = useState<string | null>(null)
  const [onlyfansShowVpnWarning, setOnlyfansShowVpnWarning] = useState(false)

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

  // ── OnlyFans ──────────────────────────────────────────────────────────────

  // Restore any in-progress OnlyFans authentication attempt when the component mounts
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem('onlyfans_auth_attempt')
    if (!stored) return
    try {
      const parsed = JSON.parse(stored) as { attemptId?: string; startedAt?: number }
      if (parsed.attemptId) {
        setOnlyfansAttemptId(parsed.attemptId)
        setOnlyfansStatus('Resuming your previous OnlyFans authentication...')
        setOnlyfansLoading(true)
        // Continue polling in the background; when the user opens the dialog they'll see live status
        pollOnlyfansStatus(parsed.attemptId)
      }
    } catch {
      // Ignore malformed storage and clear it
      window.localStorage.removeItem('onlyfans_auth_attempt')
    }
  }, [])

  const openOnlyfansDialog = () => {
    // If there is an in-progress attempt, keep it so the user sees the current status and can enter 2FA.
    // Otherwise, prepare a clean login form.
    if (!onlyfansAttemptId) {
      setOnlyfansEmail('')
      setOnlyfansPassword('')
      setOnlyfans2FACode('')
      setOnlyfansStatus(null)
      setOnlyfansShowVpnWarning(false)
    }
    setOnlyfansDialogOpen(true)
  }

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

      if (data.attemptId && !data.success && !data.requires_2fa) {
        setOnlyfansAttemptId(data.attemptId)
        setOnlyfansStatus(data.message || 'Processing authentication...')
        // Persist attempt so closing/reopening the dialog resumes the same flow
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            'onlyfans_auth_attempt',
            JSON.stringify({ attemptId: data.attemptId, startedAt: Date.now() })
          )
        }
        pollOnlyfansStatus(data.attemptId)
        return
      }

      if (data.requires_2fa) {
        setOnlyfansAttemptId(data.attemptId)
        setOnlyfansStatus('2FA code required')
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            'onlyfans_auth_attempt',
            JSON.stringify({ attemptId: data.attemptId, startedAt: Date.now() })
          )
        }
        setOnlyfansLoading(false)
        return
      }

      if (data.error) throw new Error(data.error)

      if (data.success) {
        setOnlyfansDialogOpen(false)
        setOnlyfansEmail('')
        setOnlyfansPassword('')
        setOnlyfansAttemptId(null)
        setOnlyfans2FACode('')
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('onlyfans_auth_attempt')
        }
        await loadConnections()
        try {
          await fetch('/api/onlyfans/sync', { method: 'POST' })
          setTimeout(() => window.location.reload(), 1000)
        } catch {
          setTimeout(() => setSuccess(null), 3000)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect OnlyFans')
    } finally {
      setOnlyfansLoading(false)
    }
  }

  const pollOnlyfansStatus = async (attemptId: string) => {
    let pollCount = 0
    const startedAt = Date.now()
    const TWO_MINUTES_MS = 120_000
    const poll = async () => {
      pollCount++
      if (pollCount > 90) {
        setOnlyfansLoading(false)
        setError('Authentication timed out after about 3 minutes. Please try again.')
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('onlyfans_auth_attempt')
        }
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
          setOnlyfansShowVpnWarning(false)
          setOnlyfansStatus('Please enter your 2FA code')
          setOnlyfansLoading(false)
          return
        }
        if (data.success && data.accountId) {
          setOnlyfansShowVpnWarning(false)
          setOnlyfansDialogOpen(false)
          await loadConnections()
          try {
            await fetch('/api/onlyfans/sync', { method: 'POST' })
            setTimeout(() => window.location.reload(), 1000)
          } catch { /* silent */ }
          setOnlyfansLoading(false)
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem('onlyfans_auth_attempt')
          }
          return
        }
        if (data.error || data.status === 'failed') {
          setOnlyfansShowVpnWarning(false)
          setError(data.error || data.message || 'Authentication failed')
          setOnlyfansLoading(false)
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem('onlyfans_auth_attempt')
          }
          return
        }
        setOnlyfansStatus(data.message || 'Processing...')
        if (Date.now() - startedAt >= TWO_MINUTES_MS) {
          setOnlyfansShowVpnWarning(true)
        }
        setTimeout(poll, 2000)
      } catch {
        if (Date.now() - startedAt >= TWO_MINUTES_MS) {
          setOnlyfansShowVpnWarning(true)
        }
        setTimeout(poll, 2000)
      }
    }
    poll()
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
    if (platformId === 'onlyfans') openOnlyfansDialog()
    else if (platformId === 'fansly') openFanslyDialog()
    else setError(`${platformId} integration coming soon`)
  }

  const handleSync = async (platformId: string) => {
    setSyncing(platformId)
    setError(null)
    try {
      const response = await fetch(`/api/${platformId}/sync`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Sync failed')
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
          onlyfansDialogOpen={onlyfansDialogOpen} setOnlyfansDialogOpen={setOnlyfansDialogOpen}
          onlyfansEmail={onlyfansEmail} setOnlyfansEmail={setOnlyfansEmail}
          onlyfansPassword={onlyfansPassword} setOnlyfansPassword={setOnlyfansPassword}
          onlyfansAttemptId={onlyfansAttemptId}
          onlyfans2FACode={onlyfans2FACode} setOnlyfans2FACode={setOnlyfans2FACode}
          onlyfansLoading={onlyfansLoading}
          onlyfansStatus={onlyfansStatus}
          onlyfansShowVpnWarning={onlyfansShowVpnWarning}
          handleOnlyfansLogin={handleOnlyfansLogin}
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
        onlyfansDialogOpen={onlyfansDialogOpen} setOnlyfansDialogOpen={setOnlyfansDialogOpen}
        onlyfansEmail={onlyfansEmail} setOnlyfansEmail={setOnlyfansEmail}
        onlyfansPassword={onlyfansPassword} setOnlyfansPassword={setOnlyfansPassword}
        onlyfansAttemptId={onlyfansAttemptId}
        onlyfans2FACode={onlyfans2FACode} setOnlyfans2FACode={setOnlyfans2FACode}
        onlyfansLoading={onlyfansLoading}
        onlyfansStatus={onlyfansStatus}
        onlyfansShowVpnWarning={onlyfansShowVpnWarning}
        handleOnlyfansLogin={handleOnlyfansLogin}
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
  onlyfansDialogOpen: boolean
  setOnlyfansDialogOpen: (v: boolean) => void
  onlyfansEmail: string
  setOnlyfansEmail: (v: string) => void
  onlyfansPassword: string
  setOnlyfansPassword: (v: string) => void
  onlyfansAttemptId: string | null
  onlyfans2FACode: string
  setOnlyfans2FACode: (v: string) => void
  onlyfansLoading: boolean
  onlyfansStatus: string | null
  onlyfansShowVpnWarning: boolean
  handleOnlyfansLogin: () => void
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
  onlyfansDialogOpen, setOnlyfansDialogOpen,
  onlyfansEmail, setOnlyfansEmail,
  onlyfansPassword, setOnlyfansPassword,
  onlyfansAttemptId,
  onlyfans2FACode, setOnlyfans2FACode,
  onlyfansLoading, onlyfansStatus, onlyfansShowVpnWarning,
  handleOnlyfansLogin,
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
      {/* OnlyFans Login Dialog */}
      <Dialog open={onlyfansDialogOpen} onOpenChange={setOnlyfansDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: '#00AFF015', color: '#00AFF0' }}>
                <OnlyFansLogo />
              </div>
              <div>
                <DialogTitle>Connect OnlyFans</DialogTitle>
                <DialogDescription>
                  {onlyfansAttemptId && onlyfansStatus?.includes('2FA')
                    ? 'Enter your 2FA code to complete authentication'
                    : 'Sign in with your OnlyFans credentials'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-xs text-muted-foreground rounded-lg bg-muted/50 border border-border/50 p-3">
              OnlyFans authentication can take up to a minute. If data doesn&apos;t load immediately, please wait — we&apos;ll keep checking until it&apos;s done.
            </p>
            {onlyfansStatus && (
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-sm text-blue-400 flex items-center gap-2">
                {onlyfansLoading && <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />}
                {onlyfansStatus}
              </div>
            )}
            {onlyfansShowVpnWarning && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-sm text-amber-600 dark:text-amber-400">
                Authentication is taking longer than usual and we haven&apos;t received a confirmation yet. If you&apos;re using a VPN, try disconnecting — VPNs can prevent OnlyFans authentication from completing.
              </div>
            )}

            {!onlyfansAttemptId ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="of-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="of-email" type="email" placeholder="your@email.com" value={onlyfansEmail} onChange={e => setOnlyfansEmail(e.target.value)} className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="of-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="of-password" type="password" placeholder="Enter your password" value={onlyfansPassword} onChange={e => setOnlyfansPassword(e.target.value)} className="pl-10" />
                  </div>
                </div>
              </>
            ) : onlyfansStatus?.includes('2FA') ? (
              <div className="space-y-2">
                <Label htmlFor="of-2fa">Verification Code</Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="of-2fa" type="text" placeholder="Enter 6-digit code" value={onlyfans2FACode} onChange={e => setOnlyfans2FACode(e.target.value)} className="pl-10 text-center text-lg tracking-widest" maxLength={6} />
                </div>
                <p className="text-xs text-muted-foreground">Check your email or authenticator app for the code</p>
              </div>
            ) : null}

            <Button
              className="w-full"
              style={{ background: 'linear-gradient(135deg, #00AFF0, #0090C0)' }}
              onClick={handleOnlyfansLogin}
              disabled={onlyfansLoading || (!onlyfansAttemptId && (!onlyfansEmail || !onlyfansPassword))}
            >
              {onlyfansLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {onlyfansAttemptId && onlyfansStatus?.includes('2FA') ? 'Verify & Connect' : onlyfansAttemptId ? 'Processing...' : 'Connect OnlyFans'}
            </Button>
            <p className="text-xs text-muted-foreground text-center">Your credentials are securely encrypted and never stored locally</p>
          </div>
        </DialogContent>
      </Dialog>

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
