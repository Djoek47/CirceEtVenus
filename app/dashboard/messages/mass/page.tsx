'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MassMessageComposer } from '@/components/messages/mass-message-composer'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Sparkles, ArrowLeft } from 'lucide-react'

type FanRow = {
  creator_classification: string | null
  subscription_tier: string | null
  subscription_status: string | null
  total_spent: number | string | null
  platform: string
}

type ApiSegment = {
  id: string
  name: string
  rationale: string
  match: {
    creator_classifications?: string[]
    subscription_tiers?: string[]
    subscription_statuses?: string[]
    platforms?: string[]
    min_total_spent?: number
  }
  estimated_count_hint?: string
}

function countMatch(fans: FanRow[], m: ApiSegment['match']): number {
  return fans.filter((f) => {
    if (m.platforms?.length && !m.platforms.includes(f.platform)) return false
    if (m.creator_classifications?.length) {
      const c = (f.creator_classification || '').trim() || '(unlabeled)'
      if (!m.creator_classifications.includes(c)) return false
    }
    if (m.subscription_tiers?.length) {
      const t = (f.subscription_tier || '').trim() || '(none)'
      if (!m.subscription_tiers.includes(t)) return false
    }
    if (m.subscription_statuses?.length) {
      if (!m.subscription_statuses.includes((f.subscription_status || '').trim())) return false
    }
    if (m.min_total_spent != null) {
      const spent = Number(f.total_spent) || 0
      if (spent < m.min_total_spent) return false
    }
    return true
  }).length
}

export default function MassMessagesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [platformScope, setPlatformScope] = useState<'all' | 'onlyfans' | 'fansly'>('all')
  const [fans, setFans] = useState<FanRow[]>([])
  const [loadingFans, setLoadingFans] = useState(true)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [segments, setSegments] = useState<ApiSegment[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [composerMessage, setComposerMessage] = useState('')

  useEffect(() => {
    ;(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setLoadingFans(false)
        return
      }
      const { data, error } = await supabase
        .from('fans')
        .select('creator_classification, subscription_tier, subscription_status, total_spent, platform')
        .eq('user_id', user.id)
        .limit(8000)
      if (!error && data) setFans((data as FanRow[]) ?? [])
      setLoadingFans(false)
    })()
  }, [supabase])

  const fansScoped = useMemo(() => {
    if (platformScope === 'all') return fans
    return fans.filter((f) => f.platform === platformScope)
  }, [fans, platformScope])

  const byClassification = useMemo(() => {
    const m = new Map<string, number>()
    for (const f of fansScoped) {
      const k = (f.creator_classification || '').trim() || '(unlabeled)'
      m.set(k, (m.get(k) ?? 0) + 1)
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1])
  }, [fansScoped])

  const runSegments = async () => {
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch('/api/messages/mass/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: '',
          platform: platformScope === 'all' ? undefined : platformScope,
        }),
      })
      const data = (await res.json()) as { error?: string; segments?: ApiSegment[] }
      if (!res.ok) throw new Error(data.error || 'Failed to suggest segments')
      setSegments(Array.isArray(data.segments) ? data.segments : [])
      setSelectedId(null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load segments')
      setSegments([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-4 pb-12 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-1 gap-1">
            <Link href="/dashboard/messages">
              <ArrowLeft className="h-4 w-4" />
              Back to messages
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Mass messages</h1>
          <p className="text-sm text-muted-foreground">
            AI segments from your CRM (classifications, tiers, spend). Compose below and send via connected platforms —
            review filters before send.
          </p>
        </div>
      </div>

      <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="font-medium">CRM groups</h2>
        </div>
        <div className="space-y-2">
          <Label>Platform scope (for counts below)</Label>
          <Select value={platformScope} onValueChange={(v: typeof platformScope) => setPlatformScope(v)}>
            <SelectTrigger className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All platforms</SelectItem>
              <SelectItem value="onlyfans">OnlyFans only</SelectItem>
              <SelectItem value="fansly">Fansly only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-md bg-muted/30 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Fans by creator_classification</p>
          {loadingFans ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : byClassification.length === 0 ? (
            <p className="text-xs text-muted-foreground">No fans synced for this scope.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {byClassification.map(([label, n]) => (
                <Badge key={label} variant="secondary">
                  {label}: {n}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <Button type="button" onClick={() => void runSegments()} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Suggest segments (AI)
        </Button>
        {err && <p className="text-sm text-destructive">{err}</p>}
        {segments.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Segments — click to append the rationale as a draft angle (edit before send)
            </p>
            <div className="flex flex-wrap gap-2">
              {segments.map((s) => {
                const n = countMatch(fansScoped, s.match)
                return (
                  <Badge
                    key={s.id}
                    variant={selectedId === s.id ? 'default' : 'outline'}
                    className="max-w-full cursor-pointer whitespace-normal py-1.5 text-left font-normal"
                    onClick={() => {
                      setSelectedId(s.id)
                      const angle = s.rationale?.trim()
                      if (angle) {
                        setComposerMessage((prev) => {
                          const p = prev.trim()
                          return p ? `${p}\n\n${angle}` : angle
                        })
                      }
                    }}
                    title={s.estimated_count_hint}
                  >
                    <span className="font-medium">{s.name}</span>
                    <span className="text-muted-foreground"> · ~{n} fans</span>
                  </Badge>
                )
              })}
            </div>
            {selectedId && (
              <div className="rounded-md border border-border bg-muted/20 p-3 text-sm">
                <p className="mb-1 text-xs text-muted-foreground">
                  {segments.find((x) => x.id === selectedId)?.estimated_count_hint}
                </p>
                <p className="font-medium">Rationale</p>
                <p className="text-muted-foreground">{segments.find((x) => x.id === selectedId)?.rationale}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Use composer filters (active/expired, OF lists) to align sends with this group when possible.
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      <MassMessageComposer active embedded message={composerMessage} onMessageChange={setComposerMessage} />
    </div>
  )
}
