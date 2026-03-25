import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell, ThumbsUp, Minus, ThumbsDown } from 'lucide-react'
import type { ReputationMention } from '@/lib/types'
import { MentionsHeader } from '@/components/dashboard/mentions-header'
import { MentionsListBody } from '@/components/dashboard/mentions-list-body'
import { MentionsConnectBanner } from '@/components/dashboard/mentions-connect-banner'
import { ReputationBriefingCard } from '@/components/dashboard/reputation-briefing-card'
import type { ReputationBriefingPayload } from '@/lib/reputation/briefing'

const PRO_PLANS = ['venus-pro', 'circe-elite', 'divine-duo']

export default async function MentionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const [{ data: mentions }, { data: subscription }, { data: profileRow }] = await Promise.all([
    supabase
      .from('reputation_mentions')
      .select('*')
      .eq('user_id', user.id)
      .order('detected_at', { ascending: false }),
    supabase.from('subscriptions').select('plan_id').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('profiles')
      .select('reputation_briefing, reputation_briefing_at')
      .eq('id', user.id)
      .maybeSingle(),
  ])

  const planId = (subscription as { plan_id?: string } | null)?.plan_id?.toLowerCase() || null
  const isPro = Boolean(planId && PRO_PLANS.includes(planId))

  const briefingJson = (profileRow as { reputation_briefing?: unknown; reputation_briefing_at?: string | null } | null)
    ?.reputation_briefing
  const initialBriefing =
    briefingJson && typeof briefingJson === 'object' && briefingJson !== null && 'headline' in briefingJson
      ? (briefingJson as ReputationBriefingPayload)
      : null
  const briefingAt = (profileRow as { reputation_briefing_at?: string | null } | null)?.reputation_briefing_at ?? null

  const allMentions = (mentions || []) as ReputationMention[]
  const unreviewed = allMentions.filter(m => !m.is_reviewed)
  const reviewed = allMentions.filter(m => m.is_reviewed)

  const positiveCount = allMentions.filter(m => m.sentiment === 'positive').length
  const neutralCount = allMentions.filter(m => m.sentiment === 'neutral').length
  const negativeCount = allMentions.filter(m => m.sentiment === 'negative').length

  return (
    <div className="space-y-6 min-w-0">
      <MentionsHeader />

      <MentionsConnectBanner />

      <div className="rounded-xl border border-venus/15 bg-gradient-to-r from-venus/5 via-transparent to-transparent px-4 py-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Venus&apos; Watchful Gaze</span> turns indexed mentions into a
        snapshot you can act on—suggested wording only; you post or report on each platform.
      </div>

      <ReputationBriefingCard
        initialBriefing={initialBriefing}
        briefingAt={briefingAt}
        isPro={isPro}
        mentionCount={allMentions.length}
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">To Review</p>
              <p className="text-xl font-bold">{unreviewed.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-chart-2/10 p-3">
              <ThumbsUp className="h-5 w-5 text-chart-2" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Positive</p>
              <p className="text-xl font-bold">{positiveCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-muted p-3">
              <Minus className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Neutral</p>
              <p className="text-xl font-bold">{neutralCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-destructive/10 p-3">
              <ThumbsDown className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Negative</p>
              <p className="text-xl font-bold">{negativeCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <MentionsListBody
        unreviewed={unreviewed}
        reviewed={reviewed}
        totalMentionCount={allMentions.length}
        hasBriefing={Boolean(initialBriefing)}
      />
    </div>
  )
}
