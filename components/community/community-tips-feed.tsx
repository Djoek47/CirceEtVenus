'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Loader2, Lightbulb, Send, Clock, XCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

type FeedItem = {
  id: string
  title: string
  body: string
  status: string
  created_at: string
  author_name: string | null
}

type MineItem = {
  id: string
  title: string
  body: string
  status: string
  created_at: string
}

export function CommunityTipsFeed() {
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [mySubmissions, setMySubmissions] = useState<MineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/community/tips')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof json.error === 'string' ? json.error : 'Could not load community tips.')
        setFeed([])
        setMySubmissions([])
        return
      }
      setFeed(Array.isArray(json.feed) ? json.feed : [])
      setMySubmissions(Array.isArray(json.mySubmissions) ? json.mySubmissions : [])
    } catch {
      setError('Could not load community tips.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const submit = async () => {
    const t = title.trim()
    const b = body.trim()
    if (!t || !b) {
      setError('Add a short title and your tip.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/community/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: t, body: b }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof json.error === 'string' ? json.error : 'Submit failed.')
        return
      }
      setTitle('')
      setBody('')
      await load()
    } catch {
      setError('Submit failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-8 w-8 text-amber-500" />
          <h2 className="text-2xl font-semibold tracking-tight">Community tips</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Share how you use Creatix—shortcuts, workflows, cool ideas, or things that clicked for you. Other creators see
          approved tips here; nothing goes live until our team reviews it (admin tools coming soon).
        </p>
      </div>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-lg">Share a tip</CardTitle>
          <CardDescription>
            Be specific and kind. No spam or off-topic links—focus on the product.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="tip-title">Title</Label>
            <Input
              id="tip-title"
              placeholder="e.g. How I batch Divine replies"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tip-body">Your tip</Label>
            <Textarea
              id="tip-body"
              placeholder="What did you learn? What would you tell another creator?"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              maxLength={8000}
              className="min-h-[120px] resize-y"
            />
          </div>
          <Button type="button" onClick={() => void submit()} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submit for review
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {mySubmissions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Your recent submissions</h2>
          <ul className="space-y-2">
            {mySubmissions.map((s) => (
              <li key={s.id}>
                <Card className="border-dashed">
                  <CardHeader className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-base">{s.title}</CardTitle>
                      <Badge variant={s.status === 'pending' ? 'secondary' : 'destructive'} className="gap-1">
                        {s.status === 'pending' ? (
                          <>
                            <Clock className="h-3 w-3" /> In review
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" /> Not published
                          </>
                        )}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap">{s.body}</p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">From the community</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading tips…
          </div>
        ) : feed.length === 0 ? (
          <Card className="border-border/60 bg-muted/20">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No published tips yet—be the first to share one above. Approved posts appear here for everyone.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-4">
            {feed.map((item) => (
              <li key={item.id}>
                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      <span className="text-xs text-muted-foreground">
                        {item.author_name ?? 'Creator'}{' '}
                        · {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">{item.body}</p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
