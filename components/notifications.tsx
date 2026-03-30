'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { Bell, Check, MessageSquare, Shield, TrendingUp, Users, X, Star, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'

type NotificationOrigin = 'platform_webhook' | 'divine_app' | 'platform_pull'

interface Notification {
  id: string
  type: 'message' | 'fan' | 'protection' | 'mention' | 'cosmic' | 'system'
  title: string
  description: string
  read: boolean
  created_at: string
  link?: string
  platform?: 'onlyfans' | 'fansly' | null
  avatar_url?: string | null
  origin?: NotificationOrigin | null
  platform_fan_id?: string | null
  metadata?: Record<string, unknown> | null
}

const getIcon = (type: Notification['type']) => {
  switch (type) {
    case 'message':
      return <MessageSquare className="h-4 w-4 text-primary" />
    case 'fan':
      return <Users className="h-4 w-4 text-venus dark:text-venus" />
    case 'protection':
      return <Shield className="h-4 w-4 text-circe" />
    case 'mention':
      return <TrendingUp className="h-4 w-4 text-venus dark:text-venus" />
    case 'cosmic':
      return <Star className="h-4 w-4 text-primary" />
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />
  }
}

function isLiveOrigin(o: NotificationOrigin | null | undefined): boolean {
  return o == null || o === 'platform_webhook' || o === 'platform_pull'
}

function isDivineOrigin(o: NotificationOrigin | null | undefined): boolean {
  return o === 'divine_app'
}

/** Divine tab: DMCA/leaks, reputation, whale watch, billing, and Divine Manager–originated alerts. */
function isDivineProductNotification(n: Notification): boolean {
  if (!isDivineOrigin(n.origin)) return false
  const kind = typeof n.metadata?.kind === 'string' ? n.metadata.kind : null
  if (!kind) return true
  const primary = new Set([
    'leak_scan',
    'reputation_briefing',
    'whale_watch',
    'billing',
    'dmca',
  ])
  if (primary.has(kind)) return true
  if (kind.startsWith('divine_') || kind === 'task' || kind === 'intent') return true
  return false
}

export function Notifications() {
  const [dbNotifications, setDbNotifications] = useState<Notification[]>([])
  const [ofPullNotifications, setOfPullNotifications] = useState<Notification[]>([])
  const [fanslyPullNotifications, setFanslyPullNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [tab, setTab] = useState<'live' | 'divine'>('live')
  const [briefingLoading, setBriefingLoading] = useState(false)
  const [briefingText, setBriefingText] = useState<string | null>(null)
  const supabase = createClient()

  const loadOnlyFansPull = useCallback(async () => {
    try {
      const res = await fetch('/api/onlyfans/notifications')
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json.error || !Array.isArray(json.notifications)) {
        setOfPullNotifications([])
        return
      }
      const ofNotifs: Notification[] = json.notifications.map((n: Record<string, unknown>) => ({
        id: `of-${String(n.id ?? n.notificationId ?? '')}`,
        type: 'system',
        title:
          typeof n.title === 'string' && n.title.trim().length
            ? n.title
            : typeof n.type === 'string'
              ? n.type
              : 'OnlyFans notification',
        description:
          typeof n.text === 'string' && n.text.trim().length
            ? n.text
            : typeof n.body === 'string' && n.body.trim().length
              ? n.body
              : typeof n.message === 'string'
                ? n.message
                : '',
        read: false,
        created_at:
          typeof n.createdAt === 'string'
            ? n.createdAt
            : typeof n.date === 'string'
              ? n.date
              : new Date().toISOString(),
        link: '/dashboard',
        platform: 'onlyfans',
        avatar_url: null,
        origin: 'platform_pull' as const,
      }))
      setOfPullNotifications(ofNotifs)
    } catch {
      setOfPullNotifications([])
    }
  }, [])

  const loadFanslyPull = useCallback(async () => {
    try {
      const res = await fetch('/api/fansly/notifications')
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !Array.isArray(json.notifications)) {
        setFanslyPullNotifications([])
        return
      }
      const fsNotifs: Notification[] = json.notifications.map((n: Record<string, unknown>) => ({
        id: `fs-${String(n.id ?? n.notificationId ?? '')}`,
        type: 'system',
        title:
          typeof n.title === 'string' && n.title.trim().length
            ? n.title
            : typeof n.type === 'string'
              ? n.type
              : 'Fansly notification',
        description:
          typeof n.text === 'string' && n.text.trim().length
            ? n.text
            : typeof n.body === 'string' && n.body.trim().length
              ? n.body
              : typeof n.message === 'string'
                ? n.message
                : '',
        read: false,
        created_at:
          typeof n.createdAt === 'string'
            ? n.createdAt
            : typeof n.date === 'string'
              ? n.date
              : new Date().toISOString(),
        link: '/dashboard/messages',
        platform: 'fansly',
        avatar_url: null,
        origin: 'platform_pull' as const,
      }))
      setFanslyPullNotifications(fsNotifs)
    } catch {
      setFanslyPullNotifications([])
    }
  }, [])

  const loadNotifications = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setDbNotifications([])
      setUserId(null)
      return
    }

    setUserId(user.id)

    const { data: dbNotifications, error } = await supabase
      .from('notifications')
      .select(
        'id, type, title, description, read, created_at, link, platform, avatar_url, origin, platform_fan_id, metadata',
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading notifications:', error)
      setDbNotifications([])
      return
    }

    setDbNotifications((dbNotifications || []) as Notification[])
  }, [supabase])

  useEffect(() => {
    setMounted(true)
    void loadNotifications()
  }, [loadNotifications])

  useEffect(() => {
    if (!open || !userId) return
    void loadOnlyFansPull()
    void loadFanslyPull()
  }, [open, userId, loadOnlyFansPull, loadFanslyPull])

  const liveDb = useMemo(
    () => dbNotifications.filter((n) => isLiveOrigin(n.origin)),
    [dbNotifications],
  )
  const divineDb = useMemo(
    () => dbNotifications.filter((n) => isDivineOrigin(n.origin)),
    [dbNotifications],
  )

  const liveList = useMemo(() => {
    const baseIds = new Set(liveDb.map((n) => n.id))
    const filteredOf = ofPullNotifications.filter((n) => !baseIds.has(n.id))
    const merged = [...liveDb, ...filteredOf]
    const mergedIds = new Set(merged.map((n) => n.id))
    const filteredFs = fanslyPullNotifications.filter((n) => !mergedIds.has(n.id))
    return [...merged, ...filteredFs]
  }, [liveDb, ofPullNotifications, fanslyPullNotifications])

  const divineList = useMemo(() => divineDb.filter(isDivineProductNotification), [divineDb])

  const displayed = tab === 'live' ? liveList : divineList

  const unreadCount = useMemo(() => {
    const dbUnread = dbNotifications.filter((n) => !n.read).length
    const ofUnread = ofPullNotifications.filter((n) => !n.read).length
    const fsUnread = fanslyPullNotifications.filter((n) => !n.read).length
    return dbUnread + ofUnread + fsUnread
  }, [dbNotifications, ofPullNotifications, fanslyPullNotifications])

  const runBriefing = async () => {
    setBriefingLoading(true)
    setBriefingText(null)
    try {
      const res = await fetch('/api/divine/notification-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ all_unread: true }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setBriefingText(json.error || 'Briefing failed')
        return
      }
      setBriefingText(typeof json.script === 'string' ? json.script : JSON.stringify(json, null, 2))
    } catch {
      setBriefingText('Briefing failed')
    } finally {
      setBriefingLoading(false)
    }
  }

  const markAsRead = async (id: string) => {
    setDbNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    setOfPullNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    setFanslyPullNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))

    if (id.startsWith('of-') || id.startsWith('fs-')) {
      return
    }

    if (userId) {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
        .eq('user_id', userId)

      if (error) {
        console.error('Error marking notification as read:', error)
      }
    }
  }

  const markAllAsRead = async () => {
    if (tab === 'live') {
      setOfPullNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setFanslyPullNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    }
    setDbNotifications((prev) => {
      const inChannel = prev.filter((n) =>
        tab === 'live' ? isLiveOrigin(n.origin) : isDivineOrigin(n.origin),
      )
      const ids = new Set(inChannel.map((n) => n.id))
      return prev.map((n) => (ids.has(n.id) ? { ...n, read: true } : n))
    })

    if (userId) {
      let q = supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false)

      if (tab === 'live') {
        // Include legacy rows where origin was null before migration.
        q = q.or('origin.is.null,origin.eq.platform_webhook,origin.eq.platform_pull')
      } else {
        q = q.eq('origin', 'divine_app')
      }

      const { error } = await q

      if (error) {
        console.error('Error marking all notifications as read:', error)
      }
    }
  }

  const removeNotification = async (id: string) => {
    setDbNotifications((prev) => prev.filter((n) => n.id !== id))
    setOfPullNotifications((prev) => prev.filter((n) => n.id !== id))
    setFanslyPullNotifications((prev) => prev.filter((n) => n.id !== id))

    if (id.startsWith('of-') || id.startsWith('fs-')) {
      return
    }

    if (userId) {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (error) {
        console.error('Error removing notification:', error)
      }
    }
  }

  const channelUnread = displayed.filter((n) => !n.read).length

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="relative h-11 w-11 min-h-[44px] min-w-[44px] sm:h-9 sm:w-9 sm:min-h-0 sm:min-w-0">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary dark:bg-circe text-[10px] font-bold text-primary-foreground dark:text-circe-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>
    )
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) void loadNotifications()
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-11 w-11 min-h-[44px] min-w-[44px] sm:h-9 sm:w-9 sm:min-h-0 sm:min-w-0">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="flex max-h-[min(80vh,400px)] min-h-0 w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden p-0 sm:w-96"
        align="end"
      >
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as 'live' | 'divine')}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="flex flex-shrink-0 flex-col gap-2 border-b border-border p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Notifications</h3>
              {channelUnread > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto px-2 py-1 text-xs"
                  onClick={markAllAsRead}
                >
                  Mark tab read
                </Button>
              )}
            </div>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="live" className="flex flex-col gap-0.5 py-2 h-auto">
                <span>Live</span>
                <span className="text-[10px] font-normal text-muted-foreground">OF / Fansly · webhooks + pull</span>
              </TabsTrigger>
              <TabsTrigger value="divine" className="flex flex-col gap-0.5 py-2 h-auto">
                <span>Divine</span>
                <span className="text-[10px] font-normal text-muted-foreground">Leaks · reputation · whales</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="min-h-0 flex-1 overflow-y-auto">
            <TabsContent value="live" className="m-0">
              {liveList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No live notifications</p>
                  <p className="mt-1 px-4 text-xs text-muted-foreground/80">
                    Platform webhooks (messages, tips) and optional API pull lists. Fansly pull is wired when the upstream feed is available.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {liveList.map((notification) => (
                    <NotificationRow
                      key={notification.id}
                      notification={notification}
                      mounted={mounted}
                      markAsRead={markAsRead}
                      removeNotification={removeNotification}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="divine" className="m-0">
              {divineList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No Divine notifications</p>
                  <p className="mt-1 px-4 text-xs text-muted-foreground/80">
                    DMCA and leak scans, reputation mentions, whale watch for followed fans, billing, and Divine Manager actions show here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {divineList.map((notification) => (
                    <NotificationRow
                      key={notification.id}
                      notification={notification}
                      mounted={mounted}
                      markAsRead={markAsRead}
                      removeNotification={removeNotification}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {briefingText && (
          <div className="max-h-28 flex-shrink-0 overflow-y-auto border-t border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Briefing</p>
            <p className="mt-1 whitespace-pre-wrap">{briefingText}</p>
          </div>
        )}

        <div className="flex flex-shrink-0 flex-col gap-1 border-t border-border p-2">
          <Button
            variant="secondary"
            size="sm"
            className="w-full gap-2"
            disabled={briefingLoading || !userId}
            onClick={() => void runBriefing()}
          >
            {briefingLoading ? (
              'Briefing…'
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Secretary briefing (unread)
              </>
            )}
          </Button>
          <Button variant="ghost" className="w-full justify-center text-sm" onClick={() => setOpen(false)} asChild>
            <a href="/dashboard/settings">View all settings</a>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function NotificationRow({
  notification,
  mounted,
  markAsRead,
  removeNotification,
}: {
  notification: Notification
  mounted: boolean
  markAsRead: (id: string) => void
  removeNotification: (id: string) => void
}) {
  return (
    <div
      className={cn(
        'relative flex gap-3 p-4 transition-colors hover:bg-muted/50',
        !notification.read && 'bg-primary/5',
      )}
    >
      <div className="mt-0.5 flex-shrink-0">
        {notification.platform ? (
          <div className="relative h-10 w-10">
            {notification.avatar_url ? (
              <div className="relative h-10 w-10 overflow-hidden rounded-full bg-muted ring-2 ring-border">
                <Image
                  src={notification.avatar_url}
                  alt=""
                  width={40}
                  height={40}
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted ring-2 ring-border">
                {notification.platform === 'onlyfans' ? (
                  <img src="/onlyfans-logo.png" alt="OnlyFans" className="h-5 w-5 object-contain" />
                ) : (
                  <img src="/fansly-logo.png" alt="Fansly" className="h-5 w-5 object-contain" />
                )}
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-muted overflow-hidden">
              {notification.platform === 'onlyfans' ? (
                <img src="/onlyfans-logo.png" alt="" className="h-3 w-3 object-contain" />
              ) : (
                <img src="/fansly-logo.png" alt="" className="h-3 w-3 object-contain" />
              )}
            </div>
          </div>
        ) : (
          getIcon(notification.type)
        )}
      </div>
      <div className="min-w-0 flex-1">
        <a
          href={notification.link || '#'}
          onClick={() => {
            markAsRead(notification.id)
          }}
          className="block"
        >
          <p className={cn('text-sm', !notification.read && 'font-medium')}>{notification.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{notification.description}</p>
          {notification.origin === 'platform_pull' && (
            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground/70">
              {notification.platform === 'fansly' ? 'Fansly' : 'OnlyFans'} live · not saved
            </p>
          )}
          {isDivineOrigin(notification.origin) && typeof notification.metadata?.kind === 'string' && (
            <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
              {String(notification.metadata.kind).replace(/_/g, ' ')}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground/70">
            {mounted ? formatDistanceToNow(new Date(notification.created_at), { addSuffix: true }) : ''}
          </p>
        </a>
      </div>
      <div className="flex flex-shrink-0 gap-1">
        {!notification.read && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => markAsRead(notification.id)}>
            <Check className="h-3 w-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={() => removeNotification(notification.id)}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
