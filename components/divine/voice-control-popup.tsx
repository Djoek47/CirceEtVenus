'use client'

import { useVoiceSession } from '@/components/divine/voice-session-context'
import { DivineWorkingLogo } from '@/components/divine/divine-working-logo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Mic, PhoneOff } from 'lucide-react'
import { DivineTranscriptStack } from '@/components/divine/divine-transcript-card'

export function VoiceControlPopup() {
  const voice = useVoiceSession()
  if (!voice) return null

  const {
    status,
    error,
    startVoiceCall,
    endVoiceCall,
    forceEndVoiceCall,
    voiceVizRef,
    voiceSurfaceState,
    canManualHangup,
  } = voice

  const isActive = status === 'connected' || status === 'connecting'
  const primaryLabel =
    status === 'idle'
      ? 'Idle'
      : status === 'connecting'
        ? 'Connecting…'
        : status === 'connected'
          ? 'Listening'
          : 'Error'

  return (
    <>
    <DivineTranscriptStack />
    <div
      className={cn(
        'fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-full border border-border bg-card px-3 py-2 shadow-lg transition-all',
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full',
            status === 'error'
              ? 'bg-red-500/10 text-red-500'
              : status === 'connecting'
                ? 'bg-amber-500/10 text-amber-500'
                : isActive
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-muted text-muted-foreground',
          )}
        >
          <Mic className="h-5 w-5" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium">
            Divine voice: {primaryLabel}
          </span>
          <span className="text-[11px] text-muted-foreground">
            You can keep browsing; call stays active.
          </span>
          <DivineWorkingLogo
            variant={isActive ? voiceSurfaceState : 'idle'}
            className="mt-0.5"
          />
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
          <div className="flex flex-col items-end gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={!canManualHangup}
              title={
                canManualHangup
                  ? 'End voice call'
                  : 'Wait until Divine asks if you need anything else (or force end below)'
              }
              onClick={endVoiceCall}
            >
              <PhoneOff className="h-3 w-3 mr-1" />
              End
            </Button>
            {!canManualHangup && (
              <button
                type="button"
                className="text-[10px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
                onClick={forceEndVoiceCall}
              >
                Force end call
              </button>
            )}
          </div>
        )}
      </div>
      {error && (
        <span className="ml-2 max-w-[160px] truncate text-[10px] text-destructive">
          {error}
        </span>
      )}
    </div>
    </>
  )
}

