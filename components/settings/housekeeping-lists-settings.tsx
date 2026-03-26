'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSettings, upsertSettings } from '@/lib/divine-manager'
import type { HousekeepingListsConfig, HousekeepingSegmentRule } from '@/lib/divine-manager'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Loader2, ListTree } from 'lucide-react'

const DEFAULT_SEGMENTS: HousekeepingSegmentRule[] = [
  { segment: 'whale_spend', spendMin: 500 },
  { segment: 'active_chatter', chatDays: 7 },
  { segment: 'cold', coldSpendMax: 50, chatDays: 14 },
]

export function HousekeepingListsSettings({ onlyFansConnected }: { onlyFansConnected: boolean }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [autoCreate, setAutoCreate] = useState(false)
  const [segments, setSegments] = useState<HousekeepingSegmentRule[]>(DEFAULT_SEGMENTS)
  const [lastSync, setLastSync] = useState<string | null>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setLoading(true)
    try {
      const s = await getSettings(supabase, user.id)
      const h = s?.housekeeping_lists
      if (h) {
        setEnabled(Boolean(h.enabled))
        setAutoCreate(Boolean(h.auto_create_lists))
        setLastSync(h.last_sync_at ?? null)
        if (Array.isArray(h.segments) && h.segments.length > 0) {
          setSegments(h.segments as HousekeepingSegmentRule[])
        } else {
          setSegments(DEFAULT_SEGMENTS)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const save = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setSaving(true)
    try {
      const payload: HousekeepingListsConfig = {
        enabled,
        auto_create_lists: autoCreate,
        segments,
        last_sync_at: lastSync ?? undefined,
      }
      await upsertSettings(supabase, user.id, { housekeeping_lists: payload })
    } finally {
      setSaving(false)
    }
  }

  const updateSegment = (index: number, patch: Partial<HousekeepingSegmentRule>) => {
    setSegments((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  if (!onlyFansConnected) return null

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <ListTree className="h-5 w-5" />
          OnlyFans list housekeeping
        </CardTitle>
        <CardDescription>
          Optional cron sync maps fans into OnlyFans user lists (whales, active chatters, cold). Enable auto-create to
          make “Creatix — …” lists when missing, or set list IDs per segment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border border-border p-3">
              <div>
                <Label htmlFor="hk-enabled">Enable scheduled sync</Label>
                <p className="text-xs text-muted-foreground">Runs on the server cron (off-peak). Requires saving settings.</p>
              </div>
              <Switch id="hk-enabled" checked={enabled} onCheckedChange={setEnabled} />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border border-border p-3">
              <div>
                <Label htmlFor="hk-auto">Auto-create lists</Label>
                <p className="text-xs text-muted-foreground">Creates Creatix-named lists if no override ID is set.</p>
              </div>
              <Switch id="hk-auto" checked={autoCreate} onCheckedChange={setAutoCreate} />
            </div>
            <div className="space-y-3">
              {segments.map((seg, i) => (
                <div key={seg.segment} className="rounded-lg border border-border p-3 space-y-2">
                  <p className="text-sm font-medium capitalize">{seg.segment.replace(/_/g, ' ')}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">List ID override</Label>
                      <Input
                        placeholder="Optional OnlyFans list id"
                        value={seg.listId ?? ''}
                        onChange={(e) => updateSegment(i, { listId: e.target.value.trim() || undefined })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">List name (match / auto-create)</Label>
                      <Input
                        placeholder="Optional custom name"
                        value={seg.listName ?? ''}
                        onChange={(e) => updateSegment(i, { listName: e.target.value.trim() || undefined })}
                      />
                    </div>
                  </div>
                  {seg.segment === 'whale_spend' && (
                    <div className="space-y-1">
                      <Label className="text-xs">Min spend (USD)</Label>
                      <Input
                        type="number"
                        value={seg.spendMin ?? ''}
                        onChange={(e) => updateSegment(i, { spendMin: parseFloat(e.target.value) || undefined })}
                      />
                    </div>
                  )}
                  {(seg.segment === 'active_chatter' || seg.segment === 'cold') && (
                    <div className="space-y-1">
                      <Label className="text-xs">{seg.segment === 'cold' ? 'Activity window (days)' : 'Active within (days)'}</Label>
                      <Input
                        type="number"
                        value={seg.chatDays ?? ''}
                        onChange={(e) => updateSegment(i, { chatDays: parseInt(e.target.value, 10) || undefined })}
                      />
                    </div>
                  )}
                  {seg.segment === 'cold' && (
                    <div className="space-y-1">
                      <Label className="text-xs">Max spend for “cold” (USD)</Label>
                      <Input
                        type="number"
                        value={seg.coldSpendMax ?? ''}
                        onChange={(e) => updateSegment(i, { coldSpendMax: parseFloat(e.target.value) || undefined })}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {lastSync && (
              <p className="text-xs text-muted-foreground">Last sync: {new Date(lastSync).toLocaleString()}</p>
            )}
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save housekeeping settings
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
