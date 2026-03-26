'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Sparkles } from 'lucide-react'

export function FanAiSummaryDialog({
  open,
  onOpenChange,
  platformFanId,
  fanLabel,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  platformFanId: string | null
  fanLabel: string
}) {
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<unknown>(null)
  const [pending, setPending] = useState(false)

  const load = useCallback(async () => {
    if (!platformFanId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/onlyfans/fans/${encodeURIComponent(platformFanId)}/summary`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load summary')
      setPayload(data.data ?? data)
      setPending(Boolean(data.pending))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
      setPayload(null)
    } finally {
      setLoading(false)
    }
  }, [platformFanId])

  useEffect(() => {
    if (open && platformFanId) void load()
  }, [open, platformFanId, load])

  const generate = async () => {
    if (!platformFanId) return
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch(`/api/onlyfans/fans/${encodeURIComponent(platformFanId)}/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start generation')
      setPending(true)
      setPayload(data.data ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Fan AI summary
          </DialogTitle>
          <DialogDescription>
            {fanLabel}. Generation uses OnlyFansAPI credits (about 200 on completion). Results appear when the
            provider finishes processing; we also store completed summaries locally.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={loading || !platformFanId} onClick={() => void load()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
            </Button>
            <Button type="button" size="sm" disabled={generating || !platformFanId} onClick={() => void generate()}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate / refresh'}
            </Button>
          </div>
          {pending && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Summary is still processing on OnlyFansAPI. Check back shortly or click Refresh.
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {payload != null && (
            <pre className="rounded-md border border-border bg-muted/40 p-3 text-xs overflow-x-auto whitespace-pre-wrap">
              {typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2)}
            </pre>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
