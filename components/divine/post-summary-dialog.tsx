'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type PostSummaryDialogProps = {
  open: boolean
  onClose: () => void
  onAccept: () => void
  onEditCaption: () => void
  imageUrl?: string | null
  imageScore?: number | null
  viralScore?: number | null
  caption: string
  notes?: string[]
}

export function PostSummaryDialog({
  open,
  onClose,
  onAccept,
  onEditCaption,
  imageUrl,
  imageScore,
  viralScore,
  caption,
  notes = [],
}: PostSummaryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Prepare your post
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-border bg-background/40">
            <CardContent className="p-4 space-y-3">
              <div className="aspect-square w-full rounded-md border border-border bg-muted flex items-center justify-center overflow-hidden">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-muted-foreground">No image selected</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {typeof imageScore === 'number' && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    Appeal {imageScore}/10
                  </Badge>
                )}
                {typeof viralScore === 'number' && (
                  <Badge variant="outline" className="text-xs font-normal">
                    Viral {viralScore}/100
                  </Badge>
                )}
              </div>
              {notes.length > 0 && (
                <ul className="list-disc list-inside text-[11px] text-muted-foreground space-y-0.5">
                  {notes.map((n, idx) => (
                    <li key={idx}>{n}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card className="border-border bg-background/40">
            <CardContent className="p-4 space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground">Caption</p>
                <div className="rounded-md border border-border bg-background/60 p-2 text-xs text-foreground whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {caption || 'No caption yet.'}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={onEditCaption}
                >
                  Edit caption
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Review Divine&apos;s suggestion before publishing. You can still change the caption or go back to editing.
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">
            Divine preview – nothing is posted until you confirm.
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs"
              onClick={onAccept}
            >
              Looks good, continue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

