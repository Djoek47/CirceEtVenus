'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, Loader2 } from 'lucide-react'

type OnlyFansNotification = {
  id: string
  type: string
  title?: string
  text?: string
  createdAt?: string
  fromUser?: { username?: string; name?: string }
}

export function OnlyFansNotificationsCard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [counts, setCounts] = useState<Record<string, unknown> | null>(null)
  const [notifications, setNotifications] = useState<OnlyFansNotification[]>([])
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/onlyfans/notifications')
        const json = await res.json()
        if (!res.ok || json.error) {
          if (!cancelled) {
            setError(json.error || 'Failed to load OnlyFans notifications')
            setCounts(null)
            setNotifications([])
          }
          return
        }
        if (!cancelled) {
          setCounts(json.counts || null)
          setNotifications(json.notifications || [])
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load OnlyFans notifications')
          setCounts(null)
          setNotifications([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const unread =
    (counts?.unread as number | undefined) ??
    (counts?.total as number | undefined) ??
    0

  async function handleMarkAllRead() {
    setMarking(true)
    try {
      const res = await fetch('/api/divine/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'mark_notifications_read' }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json.error) {
        setError(json.error || 'Failed to mark notifications as read')
      } else {
        setCounts((prev) => ({ ...(prev || {}), unread: 0 }))
      }
    } catch {
      setError('Failed to mark notifications as read')
    } finally {
      setMarking(false)
    }
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Bell className="h-4 w-4" />
            OnlyFans notifications
          </CardTitle>
          <CardDescription className="text-xs">
            Live alerts from your OnlyFans account
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={marking || loading}
          onClick={handleMarkAllRead}
        >
          {marking ? (
            <Loader2 className="h-3 w-3 animate-spin mr-2" />
          ) : null}
          Clear
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading notifications…
          </div>
        ) : error ? (
          <p className="text-xs text-muted-foreground">{error}</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Unread: <span className="font-medium">{unread}</span>
            </p>
            <ul className="space-y-1.5">
              {notifications.slice(0, 5).map((n) => (
                <li key={n.id} className="text-xs">
                  <span className="font-medium capitalize">{n.type}</span>{' '}
                  {n.fromUser?.username ? `@${n.fromUser.username}` : ''}
                  {': '}
                  <span className="text-muted-foreground">
                    {n.text || n.title || 'Notification'}
                  </span>
                </li>
              ))}
              {notifications.length === 0 && (
                <li className="text-xs text-muted-foreground">
                  No recent notifications from OnlyFans.
                </li>
              )}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}

