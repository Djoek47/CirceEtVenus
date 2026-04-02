'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useVoiceSession } from '@/components/divine/voice-session-context'
import { useDivinePanel } from '@/components/divine/divine-panel-context'
import { DivineWorkingLogo } from '@/components/divine/divine-working-logo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Crown, Mic, PhoneOff, Settings } from 'lucide-react'
import { DivineTranscriptStack } from '@/components/divine/divine-transcript-card'

export function VoiceControlPopup() {
  const voice = useVoiceSession()
  const divine = useDivinePanel()
  const pathname = usePathname()
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
  const [expanded, setExpanded] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const messagesOnlyMode = pathname?.startsWith('/dashboard/messages') === true

  const isActive = status === 'connected' || status === 'connecting'
  const hasStartedCall = status !== 'idle'
  const primaryLabel =
    status === 'idle'
      ? 'Idle'
      : status === 'connecting'
        ? 'Connecting…'
        : status === 'connected'
          ? 'Listening'
          : 'Error'
  useEffect(() => {
    if (isActive) setExpanded(true)
    if (!hasStartedCall) {
      setExpanded(false)
      setSettingsOpen(false)
    }
  }, [isActive, hasStartedCall])

  const toggleDivine = () => {
    if (!divine) return
    if (divine.panelOpen && !divine.panelCollapsed) {
      divine.setPanelOpen(false)
      divine.setPanelCollapsed(true)
      return
    }
    divine.setPanelCollapsed(false)
    divine.setPanelOpen(true)
  }
  const isDivineOpen = Boolean(divine?.panelOpen && !divine?.panelCollapsed)

  const handleCrownClick = async () => {
    if (status === 'idle') {
      setExpanded(true)
      setSettingsOpen(false)
      await startVoiceCall()
      return
    }
    setSettingsOpen(false)
    setExpanded((prev) => !prev)
  }

  return (
    <>
      <DivineTranscriptStack />
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        {hasStartedCall && !messagesOnlyMode && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setSettingsOpen((prev) => !prev)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gold/45 bg-card/95 text-gold shadow-md transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
              aria-label="Toggle Divine voice quick settings"
              title="Divine voice quick settings"
            >
              <Settings className="h-4 w-4" />
            </button>
            {settingsOpen && (
              <div className="absolute bottom-10 right-0 flex min-w-44 flex-col gap-1 rounded-lg border border-border bg-card/95 p-2 shadow-xl backdrop-blur-sm">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="justify-start text-xs"
                  onClick={() => {
                    toggleDivine()
                    setSettingsOpen(false)
                  }}
                >
                  {isDivineOpen ? 'Close Divine panel' : 'Open Divine panel'}
                </Button>
                {isActive && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="justify-start text-xs"
                    disabled={!canManualHangup}
                    title={
                      canManualHangup
                        ? 'End voice call'
                        : 'Wait until Divine asks if you need anything else (or force end below)'
                    }
                    onClick={() => {
                      endVoiceCall()
                      setSettingsOpen(false)
                    }}
                  >
                    End call
                  </Button>
                )}
                {isActive && !canManualHangup && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="justify-start text-xs text-destructive hover:text-destructive"
                    onClick={() => {
                      forceEndVoiceCall()
                      setSettingsOpen(false)
                    }}
                  >
                    Force end call
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="justify-start text-xs"
                  onClick={() => {
                    setExpanded((prev) => !prev)
                    setSettingsOpen(false)
                  }}
                >
                  {expanded ? 'Collapse voice control' : 'Expand voice control'}
                </Button>
              </div>
            )}
          </div>
        )}
        <div
          className={cn(
            'flex h-14 items-center overflow-hidden rounded-full border border-border bg-card/95 shadow-lg backdrop-blur-sm transition-all duration-300',
            expanded ? 'w-[min(92vw,560px)]' : 'w-14',
          )}
        >
          <div
            className={cn(
              'min-w-0 transition-all duration-300',
              expanded ? 'w-full px-3 py-2 opacity-100' : 'w-0 px-0 py-0 opacity-0',
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
              <div className="min-w-0 flex-1">
                <span className="block text-xs font-medium">Divine voice: {primaryLabel}</span>
                <span className="block text-[11px] text-muted-foreground">
                  You can keep browsing; call stays active.
                </span>
                <DivineWorkingLogo variant={isActive ? voiceSurfaceState : 'idle'} className="mt-0.5" />
              </div>
              <canvas
                ref={voiceVizRef}
                width={80}
                height={28}
                className="hidden rounded-md bg-muted sm:block"
              />
              {!isActive ? (
                <Button size="sm" className="h-7 text-xs" onClick={() => { void startVoiceCall() }}>
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
                    <PhoneOff className="mr-1 h-3 w-3" />
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
              <span className="mt-1 block max-w-[280px] truncate text-[10px] text-destructive">{error}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => { void handleCrownClick() }}
            className={cn(
              'divine-crown-trigger flex h-14 w-14 shrink-0 items-center justify-center border-l border-gold/45 text-[#1a1200] transition',
              isActive ? 'divine-crown-active' : 'divine-crown-fluctuate',
              'hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-0',
            )}
            aria-label={status === 'idle' ? 'Start Divine voice call' : expanded ? 'Collapse Divine voice control' : 'Expand Divine voice control'}
            title={status === 'idle' ? 'Start Divine voice call' : expanded ? 'Collapse Divine voice control' : 'Expand Divine voice control'}
          >
            <Crown className="h-5 w-5" />
          </button>
        </div>
      </div>
    </>
  )
}

