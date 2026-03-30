'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Megaphone } from 'lucide-react'
import { MassMessageComposer } from '@/components/messages/mass-message-composer'

export function MassMessageDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" variant="default">
          <Megaphone className="h-4 w-4" />
          Mass Message
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Send Mass Message
          </DialogTitle>
          <DialogDescription>
            Send a message to subscribers. OnlyFans and Fansly support paid (PPV) content: attach photos or videos and
            set a price so fans pay to unlock.
          </DialogDescription>
        </DialogHeader>
        <MassMessageComposer active={open} embedded={false} />
      </DialogContent>
    </Dialog>
  )
}
