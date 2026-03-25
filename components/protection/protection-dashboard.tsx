'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { LeakAlert } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Loader2, ExternalLink, Upload, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useScanIdentity } from '@/hooks/use-scan-identity'
import { ScanHandlePicker } from '@/components/dashboard/scan-handle-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Props = {
  activeAlerts: LeakAlert[]
  /** Pre-filled from profile; user can edit before scanning */
  suggestedAlias?: string | null
}

function parseAliases(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((s) => s.replace(/^@/, '').trim())
    .filter(Boolean)
}

function parseTitleHints(raw: string): string[] {
  return raw
    .split(/[\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function parseLeakMeta(notes: string | null): {
  urgency?: string
  rationale?: string
  pageVerified?: boolean
} {
  try {
    const j = JSON.parse(notes || '{}') as {
      grok?: { urgency?: string; rationale?: string }
      pageVerify?: { verifiedLikelyMatch?: boolean }
    }
    return {
      urgency: j.grok?.urgency,
      rationale: j.grok?.rationale,
      pageVerified: j.pageVerify?.verifiedLikelyMatch,
    }
  } catch {
    return {}
  }
}

function formatNotesLine(notes: string | null): string {
  const m = parseLeakMeta(notes)
  const parts: string[] = []
  if (m.urgency) parts.push(`Urgency: ${m.urgency}`)
  if (m.rationale) parts.push(m.rationale)
  if (m.pageVerified != null) parts.push(`Page verify: ${m.pageVerified ? 'likely match' : 'unclear'}`)
  if (parts.length) return parts.join(' · ')
  try {
    const j = JSON.parse(notes || '{}') as { title?: string; snippet?: string }
    return [j.title, j.snippet].filter(Boolean).join(' · ').slice(0, 280)
  } catch {
    return notes?.slice(0, 200) || ''
  }
}

function urgencyRank(u: string | undefined): number {
  if (u === 'immediate') return 0
  if (u === 'soon') return 1
  if (u === 'backlog') return 2
  return 3
}

export function ProtectionDashboard({ activeAlerts, suggestedAlias }: Props) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [scanLoading, setScanLoading] = useState(false)
  const [aliasInput, setAliasInput] = useState(() => suggestedAlias?.trim() ?? '')
  const [formerInput, setFormerInput] = useState('')
  const [titleHintsInput, setTitleHintsInput] = useState('')
  const [includeContentTitles, setIncludeContentTitles] = useState(true)
  const [strictScan, setStrictScan] = useState(true)
  const [scanSummary, setScanSummary] = useState<string | null>(null)
  const [saveIdentityLoading, setSaveIdentityLoading] = useState(false)
  const [manualUrl, setManualUrl] = useState('')
  const [manualLoading, setManualLoading] = useState(false)

  const [dmcaOpen, setDmcaOpen] = useState(false)
  const [dmcaLoading, setDmcaLoading] = useState(false)
  const [claimId, setClaimId] = useState<string | null>(null)
  const [noticeText, setNoticeText] = useState<string>('')
  const [selectedAlert, setSelectedAlert] = useState<LeakAlert | null>(null)
  const [proofUploading, setProofUploading] = useState(false)
  const [proofPaths, setProofPaths] = useState<string[]>([])
  const [isPro, setIsPro] = useState(false)

  const { handles: identityHandles, contentTitles } = useScanIdentity()
  const [useAllLeakHandles, setUseAllLeakHandles] = useState(true)
  const [selectedLeakHandles, setSelectedLeakHandles] = useState<Set<string>>(new Set())
  const [focusContentId, setFocusContentId] = useState<string>('')
  const [focusTitleFilter, setFocusTitleFilter] = useState('')
  const leakHandlesInit = useRef(false)

  const displayHandles = useMemo(() => {
    const aliases = parseAliases(aliasInput)
    const extras = aliases.filter(
      (a) => !identityHandles.some((h) => h.value.toLowerCase() === a.toLowerCase()),
    )
    const extraRows = extras.map((a) => ({
      value: a,
      source: 'alias_extra',
      label: `Extra alias @${a}`,
    }))
    return [...identityHandles, ...extraRows]
  }, [identityHandles, aliasInput])

  useEffect(() => {
    if (leakHandlesInit.current || identityHandles.length === 0) return
    leakHandlesInit.current = true
    setSelectedLeakHandles(new Set(identityHandles.map((h) => h.value)))
  }, [identityHandles])

  const severityColors: Record<string, string> = {
    critical: 'bg-destructive/20 text-destructive border-destructive/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  }

  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
          .from('subscriptions')
          .select('plan_id')
          .eq('user_id', user.id)
          .maybeSingle()
        const planId = (data as any)?.plan_id
        if (planId && ['venus-pro', 'circe-elite', 'divine-duo'].includes(planId)) {
          setIsPro(true)
        }
      } catch {
        // ignore subscription loading errors
      }
    }
    loadSubscription()
  }, [supabase])

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
          .from('profiles')
          .select('former_usernames, leak_search_title_hints')
          .eq('id', user.id)
          .maybeSingle()
        const row = data as {
          former_usernames?: string[] | null
          leak_search_title_hints?: string[] | null
        } | null
        if (row?.former_usernames?.length) {
          setFormerInput(row.former_usernames.join(', '))
        }
        if (row?.leak_search_title_hints?.length) {
          setTitleHintsInput(row.leak_search_title_hints.join('\n'))
        }
      } catch {
        // ignore
      }
    }
    loadProfile()
  }, [supabase])

  const saveSearchIdentity = useCallback(async () => {
    setSaveIdentityLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      await supabase
        .from('profiles')
        .update({
          former_usernames: parseAliases(formerInput),
          leak_search_title_hints: parseTitleHints(titleHintsInput),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
    } finally {
      setSaveIdentityLoading(false)
    }
  }, [supabase, formerInput, titleHintsInput])

  const sortedAlerts = useMemo(() => {
    return [...activeAlerts].sort((a, b) => {
      const ua = parseLeakMeta(a.notes).urgency
      const ub = parseLeakMeta(b.notes).urgency
      return urgencyRank(ua) - urgencyRank(ub)
    })
  }, [activeAlerts])

  const runScan = async () => {
    setScanLoading(true)
    setScanSummary(null)
    try {
      const aliases = parseAliases(aliasInput)
      const focusHandlesPayload =
        !useAllLeakHandles && selectedLeakHandles.size > 0
          ? Array.from(selectedLeakHandles)
          : undefined
      const focusTitlesPayload = parseTitleHints(focusTitleFilter)
      const body: Record<string, unknown> = {
        aliases,
        former_usernames: parseAliases(formerInput),
        title_hints: parseTitleHints(titleHintsInput),
        include_content_titles: includeContentTitles,
        strict: strictScan,
      }
      if (focusHandlesPayload?.length) {
        body.focus_handles = focusHandlesPayload
      }
      if (focusContentId) {
        body.content_ids = [focusContentId]
      }
      if (focusTitlesPayload.length) {
        body.focus_title_hints = focusTitlesPayload
      }

      const res = await fetch('/api/leaks/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = (await res.json().catch(() => ({}))) as {
        inserted?: number
        skipped?: number
        filteredStrict?: number
        pageVerifyCount?: number
        message?: string
        error?: string
      }
      if (res.ok) {
        setScanSummary(
          `Added ${data.inserted ?? 0} new alert(s). Skipped duplicates: ${data.skipped ?? 0}.` +
            (typeof data.filteredStrict === 'number' ? ` Filtered by strict mode: ${data.filteredStrict}.` : '') +
            (typeof data.pageVerifyCount === 'number' && data.pageVerifyCount > 0
              ? ` Critical pages verified: ${data.pageVerifyCount}.`
              : '') +
            (data.message ? ` ${data.message}` : ''),
        )
      } else {
        setScanSummary(data.error || 'Scan failed.')
      }
      router.refresh()
    } finally {
      setScanLoading(false)
    }
  }

  const reportManual = async () => {
    const url = manualUrl.trim()
    if (!url) return
    setManualLoading(true)
    try {
      await fetch('/api/leaks/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: [url] }),
      })
      setManualUrl('')
      router.refresh()
    } finally {
      setManualLoading(false)
    }
  }

  const startDmcaFromAlert = async (alert: LeakAlert) => {
    setSelectedAlert(alert)
    setDmcaOpen(true)
    setDmcaLoading(true)
    setClaimId(null)
    setNoticeText('')
    setProofPaths([])
    try {
      const res = await fetch('/api/dmca/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leakAlertId: alert.id }),
      })
      const data = await res.json()
      if (res.ok) {
        setClaimId(data.claimId)
        setNoticeText(data.notice || '')
      }
    } finally {
      setDmcaLoading(false)
    }
  }

  const uploadProof = async (file: File) => {
    if (!claimId) return
    setProofUploading(true)
    try {
      const res = await fetch('/api/dmca/proof/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId, filename: file.name, contentType: file.type }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to get upload URL')

      const { path, token } = data as { path: string; token: string; signedUrl: string }
      const { error } = await supabase.storage
        .from('dmca-proofs')
        .uploadToSignedUrl(path, token, file, { contentType: file.type || 'application/octet-stream' })
      if (error) throw new Error(error.message)

      // Attach proof path to claim
      await fetch(`/api/dmca/claim/${claimId}/proofs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proofPaths: [path] }),
      })
      setProofPaths((prev) => Array.from(new Set([...prev, path])))
    } finally {
      setProofUploading(false)
    }
  }

  return (
    <div className="space-y-4 min-w-0">
      <p className="text-xs text-muted-foreground">
        Automated search surfaces candidates for your review. Confirm each link before sending a DMCA notice.
      </p>

      <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Connect creator and social accounts under Integrations so scans include every OAuth username (X, IG, TikTok,
          OnlyFans, Fansly…).
        </p>
        <Button variant="outline" size="sm" className="shrink-0" asChild>
          <Link href="/dashboard/settings?tab=integrations">Open Integrations</Link>
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="alias-input" className="text-xs text-muted-foreground">
          Extra names and handles (comma or line; searched in addition to connected platforms)
        </Label>
        <Textarea
          id="alias-input"
          value={aliasInput}
          onChange={(e) => setAliasInput(e.target.value)}
          placeholder="e.g. stage name, alternate @handles"
          className="min-h-[72px] text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="former-input" className="text-xs text-muted-foreground">
          Former / old usernames (comma or line; saved to your profile for every scan)
        </Label>
        <Textarea
          id="former-input"
          value={formerInput}
          onChange={(e) => setFormerInput(e.target.value)}
          placeholder="Handles you used before a rebrand"
          className="min-h-[56px] text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="title-hints" className="text-xs text-muted-foreground">
          Content titles / phrases to search (one per line; merged with your library titles when enabled below)
        </Label>
        <Textarea
          id="title-hints"
          value={titleHintsInput}
          onChange={(e) => setTitleHintsInput(e.target.value)}
          placeholder="Exact or partial video or set titles that might appear on leak sites"
          className="min-h-[72px] text-sm"
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <Checkbox
            id="include-content-titles"
            checked={includeContentTitles}
            onCheckedChange={(v) => setIncludeContentTitles(v === true)}
          />
          <label htmlFor="include-content-titles" className="text-xs text-muted-foreground leading-snug cursor-pointer">
            Include published / scheduled titles from your content library in search queries (caps apply).
          </label>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={saveIdentityLoading}
          onClick={saveSearchIdentity}
        >
          {saveIdentityLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save former names &amp; title hints
        </Button>
      </div>

      <div className="flex items-start gap-2">
        <Checkbox
          id="strict-scan"
          checked={strictScan}
          onCheckedChange={(v) => setStrictScan(v === true)}
        />
        <label htmlFor="strict-scan" className="text-xs text-muted-foreground leading-snug cursor-pointer">
          Strict mode: only keep search results that likely match your content (Grok on Pro plans; keyword match
          otherwise). Your manually pasted links are always kept.
        </label>
      </div>

      {displayHandles.length > 0 && (
        <ScanHandlePicker
          handles={displayHandles}
          useAll={useAllLeakHandles}
          onUseAllChange={(v) => {
            setUseAllLeakHandles(v)
            if (!v && displayHandles.length) {
              setSelectedLeakHandles(new Set(displayHandles.map((h) => h.value)))
            }
          }}
          selected={selectedLeakHandles}
          onToggle={(value) => {
            setSelectedLeakHandles((prev) => {
              const next = new Set(prev)
              if (next.has(value)) next.delete(value)
              else next.add(value)
              return next
            })
          }}
          idPrefix="leak-scan"
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Optional: one library item (adds its title to the scan)</Label>
          <Select value={focusContentId || '__none__'} onValueChange={(v) => setFocusContentId(v === '__none__' ? '' : v)}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="All library titles (or pick one)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No single-item focus</SelectItem>
              {contentTitles.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title.length > 64 ? `${c.title.slice(0, 64)}…` : c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="focus-title-filter" className="text-xs text-muted-foreground">
            Optional: narrow title queries (one phrase per line; must match merged titles)
          </Label>
          <Textarea
            id="focus-title-filter"
            value={focusTitleFilter}
            onChange={(e) => setFocusTitleFilter(e.target.value)}
            placeholder="e.g. part of a video title"
            className="min-h-[56px] text-sm"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            className="gap-2 bg-circe hover:bg-circe/90"
            onClick={runScan}
            disabled={
              scanLoading ||
              (displayHandles.length > 0 && !useAllLeakHandles && selectedLeakHandles.size === 0)
            }
          >
            {scanLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Invoke Scan
            {isPro && (
              <Badge variant="secondary" className="ml-1 text-[10px] bg-purple-500/10 text-circe-light border-circe/40">
                Grok Pro
              </Badge>
            )}
          </Button>
          {scanSummary ? <p className="text-xs text-muted-foreground sm:max-w-md">{scanSummary}</p> : null}
        </div>
        <div className="w-full sm:max-w-md">
          <Label htmlFor="manual-url" className="text-xs text-muted-foreground">
            Bring your own link
          </Label>
          <div className="mt-1 flex gap-2">
            <Input
              id="manual-url"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="Paste infringing URL…"
            />
            <Button variant="outline" onClick={reportManual} disabled={manualLoading || !manualUrl.trim()}>
              {manualLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Report
            </Button>
          </div>
        </div>
      </div>

      {/* Active Alerts list (actionable) */}
      <div className="space-y-3">
        {sortedAlerts.map((alert) => {
          const meta = parseLeakMeta(alert.notes)
          const urgencyClass =
            meta.urgency === 'immediate'
              ? 'border-destructive text-destructive'
              : meta.urgency === 'soon'
                ? 'border-orange-500 text-orange-400'
                : 'border-muted-foreground/50 text-muted-foreground'
          return (
            <div
            key={alert.id}
            className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/30 p-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn('text-xs capitalize', severityColors[alert.severity] || 'bg-muted text-muted-foreground')}
                >
                  {alert.severity || 'unknown'}
                </Badge>
                {meta.urgency ? (
                  <Badge variant="outline" className={cn('text-xs capitalize', urgencyClass)}>
                    {meta.urgency}
                  </Badge>
                ) : null}
                <Badge variant="outline" className="text-xs capitalize">
                  {alert.status.replace('_', ' ')}
                </Badge>
                <span className="text-xs text-muted-foreground">{alert.source_platform}</span>
              </div>
              <div className="text-sm break-all">{alert.source_url}</div>
              {alert.notes ? (
                <div className="text-xs text-muted-foreground line-clamp-3">{formatNotesLine(alert.notes)}</div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <a href={alert.source_url} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View
                </a>
              </Button>
              <Button size="sm" onClick={() => startDmcaFromAlert(alert)}>
                Send DMCA
              </Button>
            </div>
          </div>
          )
        })}
      </div>

      {/* DMCA modal */}
      <Dialog open={dmcaOpen} onOpenChange={setDmcaOpen}>
        <DialogTrigger asChild>
          <span />
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>DMCA Takedown Notice</DialogTitle>
            <DialogDescription>
              Review and send a DMCA takedown notice for this leak. You can attach proof files before sending.
            </DialogDescription>
          </DialogHeader>

          {dmcaLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !claimId ? (
            <div className="text-sm text-muted-foreground">Unable to generate claim.</div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs whitespace-pre-wrap">
                {noticeText || 'Notice generated.'}
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Proof of ownership (required)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) uploadProof(f)
                      e.currentTarget.value = ''
                    }}
                    disabled={proofUploading}
                  />
                  <Button variant="outline" disabled>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </Button>
                </div>
                {proofPaths.length > 0 ? (
                  <div className="text-xs text-muted-foreground">
                    {proofPaths.length} proof file(s) attached.
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Upload at least 1 proof file before downloading.
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  asChild
                  disabled={proofPaths.length === 0}
                >
                  <a href={`/api/dmca/claim/${claimId}/download`}>
                    <FileText className="mr-2 h-4 w-4" />
                    Download DMCA Notice
                  </a>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDmcaOpen(false)
                    setSelectedAlert(null)
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

