import Link from 'next/link'
import { Moon, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getTodayCirceTip } from '@/lib/community/circe-daily-tips'

/** Shown at top of Community — links to full daily tips page */
export function CirceDailyPromo() {
  const tip = getTodayCirceTip()

  return (
    <Card className="border-circe/30 bg-gradient-to-br from-circe/10 to-card">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 text-circe-light">
          <Moon className="h-5 w-5" />
          <CardTitle className="text-lg">Daily AI tips from Circe</CardTitle>
        </div>
        <CardDescription>
          Product wisdom that rotates each day — separate from creator submissions below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Today&apos;s preview</p>
          <p className="mt-1 font-medium text-foreground">{tip.title}</p>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{tip.body}</p>
        </div>
        <Button
          asChild
          className="w-full gap-2 border-circe/40 bg-circe/10 text-circe-light hover:bg-circe/20 sm:w-auto"
          variant="outline"
        >
          <Link href="/dashboard/community/circe-daily">
            Open full tips page
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
