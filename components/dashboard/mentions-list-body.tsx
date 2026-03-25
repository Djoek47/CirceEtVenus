'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Bell,
  ThumbsUp,
  Minus,
  ThumbsDown,
  ExternalLink,
  Check,
  MessageCircle,
  Copy,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReputationMention } from '@/lib/types'

type ChannelFilter = 'all' | 'web_wide' | 'social'

const sentimentColors = {
  positive: 'bg-chart-2/20 text-chart-2 border-chart-2/30',
  neutral: 'bg-muted text-muted-foreground border-border',
  negative: 'bg-destructive/20 text-destructive border-destructive/30',
}

const sentimentIcons = {
  positive: ThumbsUp,
  neutral: Minus,
  negative: ThumbsDown,
}

function sortMentions(list: ReputationMention[]) {
  return [...list].sort((a, b) => {
    const rank = (m: ReputationMention) =>
      m.ai_reputation_impact === 'harmful' ? 0 : m.ai_reputation_impact === 'helpful' ? 2 : 1
    const d = rank(a) - rank(b)
    if (d !== 0) return d
    return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime()
  })
}

const REPORTING_TIPS =
  'Use the platform’s built-in report or abuse tools for harassment, impersonation, or non-consensual content. For serious defamation or threats, consider documenting links and timestamps and speaking with a qualified attorney — this is general information, not legal advice.'

export function MentionsListBody({
  unreviewed,
  reviewed,
}: {
  unreviewed: ReputationMention[]
  reviewed: ReputationMention[]
}) {
  const [channel, setChannel] = useState<ChannelFilter>('all')

  const filteredUnreviewed = useMemo(() => {
    let list = unreviewed
    if (channel !== 'all') list = list.filter((m) => m.scan_channel === channel)
    return sortMentions(list)
  }, [unreviewed, channel])

  const filteredReviewed = useMemo(() => {
    let list = reviewed
    if (channel !== 'all') list = list.filter((m) => m.scan_channel === channel)
    return sortMentions(list)
  }, [reviewed, channel])

  const filterChip = (id: ChannelFilter, label: string) => (
    <Button
      key={id}
      type="button"
      variant={channel === id ? 'default' : 'outline'}
      size="sm"
      className="h-8 text-xs"
      onClick={() => setChannel(id)}
    >
      {label}
    </Button>
  )

  return (
    <>
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              New Mentions
            </CardTitle>
            <CardDescription>Recent mentions requiring your review</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {filterChip('all', 'All')}
            {filterChip('web_wide', 'Web')}
            {filterChip('social', 'Social')}
          </div>
        </CardHeader>
        <CardContent>
          {filteredUnreviewed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Check className="mb-4 h-12 w-12 text-chart-2" />
              <p className="font-medium">All caught up!</p>
              <p className="text-sm text-muted-foreground">
                {channel === 'all'
                  ? 'No new mentions to review'
                  : 'No mentions in this filter'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUnreviewed.map((mention) => {
                const SentimentIcon = sentimentIcons[mention.sentiment]
                const channelLabel = mention.scan_channel === 'web_wide' ? 'Web' : 'Social'
                const showReportTips =
                  mention.ai_recommended_action === 'report' ||
                  mention.ai_reputation_impact === 'harmful'

                return (
                  <div
                    key={mention.id}
                    className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/30 p-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn('text-xs capitalize', sentimentColors[mention.sentiment])}
                        >
                          <SentimentIcon className="mr-1 h-3 w-3" />
                          {mention.sentiment}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {mention.platform}
                        </Badge>
                        {mention.scan_channel && (
                          <Badge variant="secondary" className="text-xs">
                            {channelLabel}
                          </Badge>
                        )}
                        {mention.ai_reputation_impact && (
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs capitalize',
                              mention.ai_reputation_impact === 'harmful' &&
                                'border-destructive/30 text-destructive',
                              mention.ai_reputation_impact === 'helpful' &&
                                'border-chart-2/30 text-chart-2',
                            )}
                          >
                            {mention.ai_reputation_impact === 'harmful'
                              ? 'Reputation risk'
                              : mention.ai_reputation_impact === 'helpful'
                                ? 'Helps reputation'
                                : 'Neutral impact'}
                          </Badge>
                        )}
                        {mention.ai_recommended_action && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {mention.ai_recommended_action}
                          </Badge>
                        )}
                        {mention.author && (
                          <span className="text-xs text-muted-foreground">by {mention.author}</span>
                        )}
                      </div>
                      <p className="text-sm">{mention.content_preview}</p>
                      {mention.ai_suggested_reply && (
                        <div className="mt-2 space-y-1 rounded-md border border-primary/30 bg-primary/5 p-2 text-xs">
                          <div className="flex items-center gap-1 font-medium text-primary">
                            <MessageCircle className="h-3 w-3" />
                            Suggested reply from Venus
                          </div>
                          <p className="whitespace-pre-wrap text-muted-foreground">
                            {mention.ai_suggested_reply}
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-1 h-8 gap-1"
                            onClick={() =>
                              void navigator.clipboard.writeText(mention.ai_suggested_reply || '')
                            }
                          >
                            <Copy className="h-3 w-3" />
                            Copy reply
                          </Button>
                        </div>
                      )}
                      {showReportTips && (
                        <details className="rounded-md border border-border bg-muted/30 p-2 text-xs">
                          <summary className="cursor-pointer font-medium text-muted-foreground">
                            <AlertTriangle className="mr-1 inline h-3 w-3" />
                            Reporting tips
                          </summary>
                          <p className="mt-2 text-muted-foreground">{REPORTING_TIPS}</p>
                        </details>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Detected {new Date(mention.detected_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={mention.source_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open
                        </a>
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {filteredReviewed.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-chart-2" />
              Reviewed Mentions
            </CardTitle>
            <CardDescription>Previously reviewed mentions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredReviewed.slice(0, 5).map((mention) => {
                const SentimentIcon = sentimentIcons[mention.sentiment]
                return (
                  <div
                    key={mention.id}
                    className="flex items-start justify-between rounded-lg border border-border bg-secondary/30 p-4 opacity-60"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn('text-xs capitalize', sentimentColors[mention.sentiment])}
                        >
                          <SentimentIcon className="mr-1 h-3 w-3" />
                          {mention.sentiment}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {mention.platform}
                        </Badge>
                        {mention.scan_channel && (
                          <Badge variant="secondary" className="text-xs">
                            {mention.scan_channel === 'web_wide' ? 'Web' : 'Social'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm">{mention.content_preview}</p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={mention.source_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
