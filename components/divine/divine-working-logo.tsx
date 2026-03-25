'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

export function DivineWorkingLogo({
  working,
  phaseHint,
  className,
}: {
  working: boolean
  /** When working, replaces the default “Divine is working…” line (e.g. tools vs reply). */
  phaseHint?: string | null
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-2 text-xs text-muted-foreground', className)}>
      <div
        className={cn(
          'relative h-7 w-7 overflow-hidden rounded-full border border-border bg-background',
          working && 'animate-pulse',
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
        <span className="font-medium text-foreground">Divine</span>
        <span className="text-[11px]">
          {working ? (phaseHint ?? 'Divine is working…') : 'Idle'}
        </span>
      </div>
    </div>
  )
}

