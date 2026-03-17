'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, MessageCircle } from 'lucide-react'

type FanInfo = {
  id: string
  username?: string | null
  name?: string | null
}

type ThreadMessage = {
  from: string
  text: string
}

type PersonaKey = 'circe' | 'venus' | 'flirt'

const PERSONA_LABELS: Record<PersonaKey, string> = {
  circe: 'Circe Reply',
  venus: 'Venus Reply',
  flirt: 'Flirt Reply',
}

export interface DivineReplyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fan: FanInfo
  circeSuggestions: string[]
  venusSuggestions: string[]
  flirtSuggestions: string[]
  recommendedPersona?: PersonaKey | null
  recommendationReason?: string | null
}

export function DivineReplyDialog({
  open,
  onOpenChange,
  fan,
  circeSuggestions,
  venusSuggestions,
  flirtSuggestions,
  recommendedPersona,
  recommendationReason,
}: DivineReplyDialogProps) {
  const router = useRouter()
  const [thread, setThread] = useState<ThreadMessage[]>([])
  const [loadingThread, setLoadingThread] = useState(false)
  const [threadError, setThreadError] = useState<string | null>(null)
  const displayName = fan.name || fan.username || `Fan ${fan.id}`

  useEffect(() => {
    if (!open || !fan?.id) return
    let cancelled = false
    const load = async () => {
      setLoadingThread(true)
      setThreadError(null)
      try {
        const res = await fetch('/api/divine/dm-thread', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fanId: fan.id }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          const msg = (data as { error?: string }).error
          if (!cancelled) {
            setThreadError(
              msg || (res.status === 404 ? 'Thread not found for this fan.' : 'Failed to load thread.'),
            )
          }
          return
        }
        const t = ((data as { thread?: ThreadMessage[] }).thread ?? []) as ThreadMessage[]
        if (!cancelled) setThread(t)
      } catch {
        if (!cancelled) setThreadError('Failed to load thread.')
      } finally {
        if (!cancelled) setLoadingThread(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [open, fan?.id])

  const copyPrompt = async (persona: PersonaKey, text: string) => {
    const baseLabel = persona === 'circe' ? 'Circe' : persona === 'venus' ? 'Venus' : 'Flirt'
    const handle = fan.username ? `@${fan.username}` : displayName
    const prompt = `(${baseLabel}) Reply to ${handle}: ${text}`
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(prompt)
      } catch {
        // swallow; user can still select manually
      }
    }
  }

  const openMessages = () => {
    router.push(`/dashboard/messages?fanId=${encodeURIComponent(String(fan.id))}`)
    onOpenChange(false)
  }

  const personaConfigs: { key: PersonaKey; suggestions: string[] }[] = [
    { key: 'circe', suggestions: circeSuggestions },
    { key: 'venus', suggestions: venusSuggestions },
    { key: 'flirt', suggestions: flirtSuggestions },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" />
            Divine reply for {displayName}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Recent thread</p>
            <div className="h-64 rounded-md border border-border bg-muted/20 p-2 overflow-y-auto text-xs space-y-1">
              {loadingThread && (
                <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Loading thread…</span>
                </div>
              )}
              {!loadingThread && threadError && (
                <p className="text-[11px] text-destructive">{threadError}</p>
              )}
              {!loadingThread && !threadError && thread.length === 0 && (
                <p className="text-[11px] text-muted-foreground">No messages yet for this fan.</p>
              )}
              {thread.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${
                    m.from === 'creator' ? 'justify-end text-muted-foreground' : 'justify-start'
                  }`}
                >
                  <div className="max-w-[80%] rounded-md bg-background px-2 py-1 text-[11px]">
                    <span className="font-medium mr-1">{m.from === 'creator' ? 'You' : 'Fan'}:</span>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 text-xs"
              onClick={openMessages}
            >
              Open in Messages
            </Button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Circe, Venus, and Flirt suggestions (click to copy prompt).
              </p>
              {recommendedPersona && (
                <Badge variant="secondary" className="text-[10px] uppercase">
                  Recommended: {recommendedPersona}
                </Badge>
              )}
            </div>
            {recommendationReason && (
              <p className="text-[11px] text-muted-foreground">{recommendationReason}</p>
            )}
            <div className="grid gap-2 sm:grid-cols-1">
              {personaConfigs.map(({ key, suggestions }) => {
                const first = suggestions[0]
                if (!first) return null
                const isRecommended = recommendedPersona === key
                return (
                  <div
                    key={key}
                    className="rounded-md border border-border bg-muted/30 p-2 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium">
                        {PERSONA_LABELS[key]}
                        {isRecommended ? ' (recommended)' : ''}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px]"
                          onClick={() => copyPrompt(key, first)}
                        >
                          Copy prompt
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[10px]"
                          onClick={openMessages}
                        >
                          Reply in Messages
                        </Button>
                      </div>
                    </div>
                    <textarea
                      readOnly
                      className="w-full rounded-md border border-border bg-background/60 px-2 py-1 text-[11px] text-foreground min-h-[72px]"
                      value={`Reply to ${fan.username ? `@${fan.username}` : displayName}: ${first}`}
                    />
                  </div>
                )
              })}
              {!circeSuggestions.length && !venusSuggestions.length && !flirtSuggestions.length && (
                <p className="text-[11px] text-muted-foreground">
                  No suggestions available yet. Ask Divine to scan the thread and propose replies.
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

