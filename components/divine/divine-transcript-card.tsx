'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Copy, X } from 'lucide-react'
import { useDivinePanel } from '@/components/divine/divine-panel-context'

export function DivineTranscriptStack() {
  const panel = useDivinePanel()
  const transcript = panel?.divineTranscript
  const remainingMs = panel?.scheduledDmRemainingMs ?? 0
  const cancelSchedule = panel?.cancelScheduledDm

  const showSchedule = remainingMs > 0
  const sec = Math.ceil(remainingMs / 1000)

  if (!panel || (!transcript && !showSchedule)) return null

  return (
    <div
      className={cn(
        'fixed z-[42] flex flex-col items-end gap-2',
        'bottom-[5.5rem] right-6 max-w-[min(100vw-2rem,380px)]',
      )}
    >
      {showSchedule && (
        <div className="w-full rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
          <div className="flex items-center justify-between gap-2">
            <span>
              Auto-send in <strong>{sec}s</strong>…
            </span>
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={cancelSchedule}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {transcript && (
        <div className="w-full rounded-lg border border-border bg-card/95 p-3 shadow-lg backdrop-blur-sm">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {transcript.title ?? 'Divine text'}
            </span>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="Copy"
                onClick={() => {
                  void navigator.clipboard?.writeText(transcript.text)
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="Dismiss"
                onClick={() => panel?.dismissDivineTranscript()}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-xs text-foreground">{transcript.text}</p>
        </div>
      )}
    </div>
  )
}
