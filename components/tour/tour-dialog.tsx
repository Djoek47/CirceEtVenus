'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react'
import type { TourStep } from '@/lib/tour-config'

interface TourDialogProps {
  open: boolean
  onClose: () => void
  steps: TourStep[]
  stepIndex: number
  onNext: () => void
  onBack: () => void
  tourId: string
}

export function TourDialog({
  open,
  onClose,
  steps,
  stepIndex,
  onNext,
  onBack,
  tourId,
}: TourDialogProps) {
  if (steps.length === 0) return null
  const step = steps[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === steps.length - 1

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md gap-4" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2 text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            <span className="text-xs">
              Step {stepIndex + 1} of {steps.length}
            </span>
          </div>
          <DialogTitle className="text-lg">{step.title}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {step.description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between gap-2 pt-2">
          <div>
            {!isFirst ? (
              <Button type="button" variant="outline" size="sm" onClick={onBack} className="gap-1">
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            ) : (
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                Skip tour
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {isLast ? (
              <Button type="button" size="sm" onClick={onClose} aria-label="Finish tour">
                Done
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={onNext} className="gap-1">
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
