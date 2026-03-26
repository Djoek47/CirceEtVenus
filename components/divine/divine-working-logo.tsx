'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { VoiceSurfaceState } from '@/components/divine/voice-session-context'

export function DivineWorkingLogo({
  working,
  variant,
  phaseHint,
  className,
}: {
  /** Legacy: when true, treat as working (non-idle) unless `variant` is set. */
  working?: boolean
  /** When provided, drives border/text: idle | working (purple) | speaking (gold). */
  variant?: VoiceSurfaceState
  /** When working, replaces the default “Divine is working…” line (e.g. tools vs reply). */
  phaseHint?: string | null
  className?: string
}) {
  const v: VoiceSurfaceState =
    variant ?? (working ? 'working' : 'idle')

  const label =
    v === 'speaking'
      ? 'Speaking…'
      : v === 'working'
        ? (phaseHint ?? 'Divine is working…')
        : 'Idle'

  return (
    <div className={cn('flex items-center gap-2 text-xs text-muted-foreground', className)}>
      <div
        className={cn(
          'relative h-7 w-7 overflow-hidden rounded-full border bg-background',
          v === 'idle' && 'border-border',
          v === 'working' && 'border-purple-500/80 animate-pulse shadow-[0_0_12px_rgba(168,85,247,0.35)]',
          v === 'speaking' && 'border-amber-400/90 shadow-[0_0_14px_rgba(245,158,11,0.45)]',
        )}
      >
        <Image
          src="/favicon.png"
          alt="Circe et Venus"
          fill
          sizes="28px"
          className="object-contain"
        />
      </div>
      <div className="flex flex-col leading-tight">
        <span
          className={cn(
            'font-medium',
            v === 'working' && 'text-purple-600 dark:text-purple-400',
            v === 'speaking' && 'text-amber-600 dark:text-amber-400',
            v === 'idle' && 'text-foreground',
          )}
        >
          Divine
        </span>
        <span
          className={cn(
            'text-[11px]',
            v === 'working' && 'text-purple-600/90 dark:text-purple-400/90',
            v === 'speaking' && 'text-amber-600/90 dark:text-amber-400/90',
          )}
        >
          {label}
        </span>
      </div>
    </div>
  )
}
