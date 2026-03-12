'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getTourForPath } from '@/lib/tour-config'
import { TourDialog } from './tour-dialog'

const STORAGE_PREFIX = 'circe-tour-done-'

function getTourCompleted(tourId: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(STORAGE_PREFIX + tourId) === '1'
  } catch {
    return false
  }
}

function setTourCompleted(tourId: string) {
  try {
    localStorage.setItem(STORAGE_PREFIX + tourId, '1')
  } catch {
    // ignore
  }
}

type TourContextValue = {
  startTour: () => void
  isOpen: boolean
  currentTourId: string | null
}

const TourContext = createContext<TourContextValue | null>(null)

export function useTour() {
  const ctx = useContext(TourContext)
  return ctx
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const config = useMemo(() => getTourForPath(pathname ?? '/dashboard'), [pathname])
  const [open, setOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)

  const startTour = useCallback(() => {
    if (!config || config.steps.length === 0) return
    setStepIndex(0)
    setOpen(true)
  }, [config])

  const onNext = useCallback(() => {
    if (!config) return
    if (stepIndex < config.steps.length - 1) {
      setStepIndex((i) => i + 1)
    } else {
      setTourCompleted(config.tourId)
      setOpen(false)
    }
  }, [config, stepIndex])

  const onBack = useCallback(() => {
    if (stepIndex > 0) setStepIndex((i) => i - 1)
  }, [stepIndex])

  const onClose = useCallback(() => {
    if (config) setTourCompleted(config.tourId)
    setOpen(false)
  }, [config])

  const value = useMemo<TourContextValue>(
    () => ({
      startTour,
      isOpen: open,
      currentTourId: config?.tourId ?? null,
    }),
    [startTour, open, config?.tourId]
  )

  return (
    <TourContext.Provider value={value}>
      {children}
      {config && config.steps.length > 0 && (
        <TourDialog
          open={open}
          onClose={onClose}
          steps={config.steps}
          stepIndex={stepIndex}
          onNext={onNext}
          onBack={onBack}
          tourId={config.tourId}
        />
      )}
    </TourContext.Provider>
  )
}
