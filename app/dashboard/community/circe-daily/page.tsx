import Link from 'next/link'
import { Moon, Sparkles, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  CIRCE_DAILY_TIPS,
  getCirceTipIndexForToday,
  getTodayCirceTip,
  type CirceDailyTip,
} from '@/lib/community/circe-daily-tips'

function TipLink({ tip }: { tip: CirceDailyTip }) {
  if (!tip.link) return null
  const external = /^https?:\/\//i.test(tip.link.href)
  return (
    <Button variant="outline" size="sm" className="mt-3 gap-1.5 border-circe/40 text-circe-light" asChild>
      <Link href={tip.link.href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {tip.link.label}
        {external && <ExternalLink className="h-3 w-3 opacity-70" />}
      </Link>
    </Button>
  )
}

export default function CirceDailyTipsPage() {
  const today = getTodayCirceTip()
  const todayIdx = getCirceTipIndexForToday()

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-4 pb-14 sm:p-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Moon className="h-8 w-8 text-circe-light" />
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Daily AI tips from Circe</h1>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Short, practical guidance for using Circe et Venus well. One tip is highlighted each day; the full list is
          always here. For creator-to-creator ideas, see{' '}
          <Link href="/dashboard/community" className="text-primary underline hover:no-underline">
            Community
          </Link>
          .
        </p>
      </div>

      <Card className="border-circe/35 bg-gradient-to-br from-circe/10 via-card to-card">
        <CardHeader>
          <div className="flex items-center gap-2 text-circe-light">
            <Sparkles className="h-5 w-5" />
            <CardTitle className="text-lg">Today&apos;s tip</CardTitle>
          </div>
          <CardDescription>Tip #{todayIdx + 1} of {CIRCE_DAILY_TIPS.length} — rotates daily</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">{today.title}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{today.body}</p>
          <TipLink tip={today} />
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">All tips</h2>
        <ul className="space-y-4">
          {CIRCE_DAILY_TIPS.map((tip, i) => (
            <li key={tip.id}>
              <Card className={i === todayIdx ? 'ring-1 ring-circe/40' : ''}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{tip.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{tip.body}</p>
                  <TipLink tip={tip} />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-center text-xs text-muted-foreground">
        <Link href="/dashboard/community" className="text-primary underline hover:no-underline">
          ← Back to Community
        </Link>
        {' · '}
        <Link href="/dashboard/guide#circe-daily-tips" className="text-primary underline hover:no-underline">
          Mentioned in Guide
        </Link>
      </p>
    </div>
  )
}
