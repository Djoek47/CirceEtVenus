import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bell, ThumbsUp, Minus, ThumbsDown, ExternalLink, Check, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReputationMention } from '@/lib/types'

export default async function MentionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: mentions } = await supabase
    .from('reputation_mentions')
    .select('*')
    .eq('user_id', user.id)
    .order('detected_at', { ascending: false })

  const allMentions = mentions || []
  const unreviewed = allMentions.filter(m => !m.is_reviewed)
  const reviewed = allMentions.filter(m => m.is_reviewed)

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

  const positiveCount = allMentions.filter(m => m.sentiment === 'positive').length
  const neutralCount = allMentions.filter(m => m.sentiment === 'neutral').length
  const negativeCount = allMentions.filter(m => m.sentiment === 'negative').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <span className="text-venus">Venus'</span> Watchful Gaze
          </h2>
          <p className="text-muted-foreground">
            The goddess tracks your reputation and sentiment across the realm
          </p>
        </div>
        <Button className="gap-2 bg-venus hover:bg-venus/90 text-background">
          <RefreshCw className="h-4 w-4" />
          Refresh Vision
        </Button>
      </div>

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

      {/* Unreviewed Mentions */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            New Mentions
          </CardTitle>
          <CardDescription>Recent mentions requiring your review</CardDescription>
        </CardHeader>
        <CardContent>
          {unreviewed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Check className="mb-4 h-12 w-12 text-chart-2" />
              <p className="font-medium">All caught up!</p>
              <p className="text-sm text-muted-foreground">No new mentions to review</p>
            </div>
          ) : (
            <div className="space-y-4">
              {unreviewed.map((mention) => {
                const SentimentIcon = sentimentIcons[mention.sentiment]
                return (
                  <div
                    key={mention.id}
                    className="flex items-start justify-between rounded-lg border border-border bg-secondary/30 p-4"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn('text-xs capitalize', sentimentColors[mention.sentiment])}>
                          <SentimentIcon className="mr-1 h-3 w-3" />
                          {mention.sentiment}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {mention.platform}
                        </Badge>
                        {mention.author && (
                          <span className="text-xs text-muted-foreground">
                            by {mention.author}
                          </span>
                        )}
                      </div>
                      <p className="text-sm">{mention.content_snippet}</p>
                      <p className="text-xs text-muted-foreground">
                        Detected {new Date(mention.detected_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View
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

      {/* Reviewed Mentions */}
      {reviewed.length > 0 && (
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
              {reviewed.slice(0, 5).map((mention) => {
                const SentimentIcon = sentimentIcons[mention.sentiment]
                return (
                  <div
                    key={mention.id}
                    className="flex items-start justify-between rounded-lg border border-border bg-secondary/30 p-4 opacity-60"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn('text-xs capitalize', sentimentColors[mention.sentiment])}>
                          <SentimentIcon className="mr-1 h-3 w-3" />
                          {mention.sentiment}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {mention.platform}
                        </Badge>
                      </div>
                      <p className="text-sm">{mention.content_snippet}</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
