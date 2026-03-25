'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function MentionsConnectBanner() {
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Connect OnlyFans, Fansly, X, Instagram, or TikTok under Integrations so scans use each platform username.
          Former names from Protection are included automatically when saved.
        </p>
        <Button asChild variant="outline" size="sm" className="shrink-0 border-venus/40 text-venus hover:bg-venus/10">
          <Link href="/dashboard/settings?tab=integrations">Connect platforms</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
