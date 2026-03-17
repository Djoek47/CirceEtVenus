'use client'

import { useVoiceSession } from '@/components/divine/voice-session-context'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Mic, PhoneOff } from 'lucide-react'

export function VoiceControlPopup() {
  const voice = useVoiceSession()
  if (!voice) return null

  const { status, error, startVoiceCall, endVoiceCall, voiceVizRef } = voice

  const isActive = status === 'connected' || status === 'connecting'

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-full border border-border bg-card px-3 py-2 shadow-lg transition-all',
      )}
    >
      <div className="flex items-center gap-2">
        <div className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full',
          isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'
        )}>
          <Mic className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-medium">
            {status === 'idle' && 'Voice control idle'}
            {status === 'connecting' && 'Connecting voice…'}
            {status === 'connected' && 'Divine is listening'}
            {status === 'error' && 'Voice error'}
          </span>
          <span className="text-[11px] text-muted-foreground">
            You can keep browsing; call stays active.
          </span>
        </div>
      </div>
      <canvas
        ref={voiceVizRef}
        width={80}
        height={28}
        className="hidden sm:block rounded-md bg-muted"
      />
      <div className="flex items-center gap-1">
        {!isActive ? (
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={() => { void startVoiceCall() }}
          >
            Start call
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={endVoiceCall}
          >
            <PhoneOff className="h-3 w-3 mr-1" />
            End
          </Button>
        )}
      </div>
      {error && (
        <span className="ml-2 max-w-[160px] truncate text-[10px] text-destructive">
          {error}
        </span>
      )}
    </div>
  )
}

