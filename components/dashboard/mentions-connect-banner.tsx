'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function MentionsConnectBanner() {
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          OAuth is optional: you can add manual search handles on this page for indexed reputation scans. Connecting
          OnlyFans, Fansly, X, Instagram, or TikTok adds those usernames automatically. Former @names from Protection
          are included when saved.
        </p>
        <Button asChild variant="outline" size="sm" className="shrink-0 border-venus/40 text-venus hover:bg-venus/10">
          <Link href="/dashboard/settings?tab=integrations">Connect platforms</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
