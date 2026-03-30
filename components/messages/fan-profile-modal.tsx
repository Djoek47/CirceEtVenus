'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, RefreshCw } from 'lucide-react'
import { proxyImageUrl } from '@/lib/proxy-image-url'
import type { UnifiedFanProfilePayload } from '@/lib/divine/fan-profile-server'
import { cn } from '@/lib/utils'

type FanProfileModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  fanId: string
  platform?: 'onlyfans' | 'fansly'
  /** Shown while loading before API returns */
  initialUsername?: string | null
  initialName?: string | null
  initialAvatar?: string | null
}

function formatProfileSection(profileJson: unknown): { label: string; items: string[] }[] {
  if (!profileJson || typeof profileJson !== 'object') return []
  const o = profileJson as Record<string, unknown>
  const keys: Array<{ key: string; label: string }> = [
    { key: 'preferences', label: 'Preferences' },
    { key: 'interests', label: 'Interests' },
    { key: 'hobbies', label: 'Hobbies' },
    { key: 'travel_plans', label: 'Travel' },
    { key: 'content_requests', label: 'Content requests' },
  ]
  const out: { label: string; items: string[] }[] = []
  for (const { key, label } of keys) {
    const v = o[key]
    if (Array.isArray(v)) {
      const items = v.map((x) => String(x)).filter(Boolean)
      if (items.length) out.push({ label, items })
    }
  }
  if (typeof o.relationship_notes === 'string' && o.relationship_notes.trim()) {
    out.push({ label: 'Relationship notes', items: [o.relationship_notes.trim()] })
  }
  if (typeof o.tone === 'string' && o.tone.trim()) {
    out.push({ label: 'Tone', items: [o.tone.trim()] })
  }
  return out
}

export function FanProfileModal({
  open,
  onOpenChange,
  fanId,
  platform = 'onlyfans',
  initialUsername,
  initialName,
  initialAvatar,
}: FanProfileModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<UnifiedFanProfilePayload | null>(null)
  const [classificationDraft, setClassificationDraft] = useState('')
  const [savingClass, setSavingClass] = useState(false)

  const load = useCallback(async () => {
    if (!fanId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/divine/fan-profile?fanId=${encodeURIComponent(fanId)}&platform=${encodeURIComponent(platform)}`,
        { credentials: 'include' },
      )
      const json = (await res.json().catch(() => ({}))) as UnifiedFanProfilePayload & { error?: string }
      if (!res.ok) throw new Error(json.error || 'Failed to load profile')
      setData(json)
      setClassificationDraft(json.creatorClassification ?? '')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [fanId, platform])

  useEffect(() => {
    if (!open || !fanId) return
    void load()
  }, [open, fanId, load])

  const displayName =
    data?.core?.displayName || initialName || data?.core?.username || initialUsername || 'Fan'
  const username = data?.core?.username || initialUsername || '—'
  const avatar = data?.core?.avatarUrl || initialAvatar || ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="sr-only">Fan profile</DialogTitle>
          <DialogDescription className="sr-only">
            Fan id, platform, thread insights, and AI summary
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20 border border-border">
              <AvatarImage src={proxyImageUrl(avatar) || avatar || undefined} />
              <AvatarFallback className="bg-primary/10 text-2xl text-primary">
                {displayName[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-lg font-semibold">{displayName}</p>
              <p className="truncate text-sm text-muted-foreground">@{username}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="tabular-nums text-xs">
                  ID {fanId}
                </Badge>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                    platform === 'onlyfans' ? 'bg-sky-500/10 text-sky-600' : 'bg-blue-500/10 text-blue-600',
                  )}
                >
                  {platform === 'onlyfans' ? 'OnlyFans' : 'Fansly'}
                </span>
                {data?.creatorDetector?.is_creator_likely && (
                  <Badge variant="outline" className="text-xs">
                    Creator signal ({Math.round((data.creatorDetector.confidence || 0) * 100)}%)
                  </Badge>
                )}
              </div>
            </div>
            <Button type="button" variant="outline" size="icon" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>

          {loading && !data && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading profile…
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
            <Label htmlFor="fan-creator-classification" className="text-xs font-medium">
              Your label (optional)
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Private note for notifications and Divine — e.g. &quot;VIP&quot;, &quot;follow up Friday&quot;.
            </p>
            <div className="flex gap-2">
              <Input
                id="fan-creator-classification"
                value={classificationDraft}
                onChange={(e) => setClassificationDraft(e.target.value)}
                placeholder="Empty by default"
                className="text-sm"
                disabled={savingClass || loading}
                maxLength={2000}
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={savingClass || loading || !fanId}
                onClick={async () => {
                  setSavingClass(true)
                  setError(null)
                  try {
                    const res = await fetch('/api/divine/fan-profile', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({
                        fanId,
                        platform,
                        creator_classification: classificationDraft.trim() || null,
                      }),
                    })
                    const json = (await res.json().catch(() => ({}))) as UnifiedFanProfilePayload & {
                      error?: string
                    }
                    if (!res.ok) throw new Error(json.error || 'Save failed')
                    setData(json)
                    setClassificationDraft(json.creatorClassification ?? '')
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Save failed')
                  } finally {
                    setSavingClass(false)
                  }
                }}
              >
                Save
              </Button>
            </div>
          </div>

          {data?.creatorDetector && (
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
              <p className="font-medium">Creator likelihood</p>
              <p className="mt-1 text-muted-foreground">
                {data.creatorDetector.is_creator_likely
                  ? 'Heuristic suggests this fan may also create content or promote a page.'
                  : 'No strong creator-style signals in stored text (heuristic).'}
              </p>
              {data.creatorDetector.rationale_snippets.length > 0 && (
                <ul className="mt-2 list-inside list-disc text-xs text-muted-foreground">
                  {data.creatorDetector.rationale_snippets.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {data?.threadInsight?.profileJson != null &&
            formatProfileSection(data.threadInsight.profileJson).length > 0 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold">Thread profile</p>
              {formatProfileSection(data.threadInsight.profileJson).map((block) => (
                <div key={block.label}>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{block.label}</p>
                  <ul className="mt-1 list-inside list-disc text-sm">
                    {block.items.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {data?.aiSummary?.summaryJson != null && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">AI summary</p>
              <pre className="max-h-40 overflow-auto rounded-md bg-muted/50 p-3 text-xs whitespace-pre-wrap break-words">
                {JSON.stringify(data.aiSummary.summaryJson, null, 2)}
              </pre>
              {data.aiSummary.lastAnalyzedAt && (
                <p className="text-xs text-muted-foreground">
                  Last analyzed: {new Date(data.aiSummary.lastAnalyzedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {data?.threadInsight?.threadSnapshotExcerpt && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Thread snapshot (excerpt)</p>
              <p className="max-h-40 overflow-auto rounded-md bg-muted/30 p-3 text-xs whitespace-pre-wrap text-muted-foreground">
                {data.threadInsight.threadSnapshotExcerpt}
              </p>
              {data.threadInsight.lastThreadRefreshAt && (
                <p className="text-xs text-muted-foreground">
                  Refreshed: {new Date(data.threadInsight.lastThreadRefreshAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {!loading && data && !data.threadInsight && !data.aiSummary?.summaryJson && (
            <p className="text-sm text-muted-foreground">
              No stored thread insight or AI summary yet. Open this chat and send a message, or wait for background
              refresh.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
