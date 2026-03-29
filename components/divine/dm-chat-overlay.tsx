'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useDivinePanel } from '@/components/divine/divine-panel-context'
import { ChatWindow } from '@/components/messages/chat-window'
import { Button } from '@/components/ui/button'
import { Calendar, ChevronDown, ChevronUp, User, X } from 'lucide-react'
import { FanProfileModal } from '@/components/messages/fan-profile-modal'
import { cn } from '@/lib/utils'

type FanMeta = { username?: string | null; display_name?: string | null }

type ScheduleItem = { id: string; title: string; scheduled_at?: string | null }

export function DmChatOverlay() {
  const panel = useDivinePanel()
  const [meta, setMeta] = useState<FanMeta | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [scheduleStrip, setScheduleStrip] = useState<ScheduleItem[]>([])

  const collapsed = panel?.dmOverlayCollapsed ?? false
  const userId = panel?.user?.id

  const fanIds = useMemo(() => {
    if (!panel) return []
    const ids = [...panel.dmOverlayFanIds]
    const active = panel.dmOverlayFanId
    if (active && !ids.includes(active)) ids.push(active)
    return ids
  }, [panel?.dmOverlayFanIds, panel?.dmOverlayFanId])

  const activeFanId = useMemo(() => {
    const raw = panel?.dmOverlayFanId
    if (raw && fanIds.includes(raw)) return raw
    return fanIds[0] ?? null
  }, [panel?.dmOverlayFanId, fanIds])

  const threadRefreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!activeFanId) return
    if (threadRefreshDebounceRef.current) clearTimeout(threadRefreshDebounceRef.current)
    threadRefreshDebounceRef.current = setTimeout(() => {
      void fetch('/api/divine/refresh-thread-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fanId: activeFanId }),
      }).catch(() => undefined)
    }, 4000)
    return () => {
      if (threadRefreshDebounceRef.current) clearTimeout(threadRefreshDebounceRef.current)
    }
  }, [activeFanId])

  useEffect(() => {
    if (!activeFanId) {
      setMeta(null)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(`/api/divine/fan-recents?fanId=${encodeURIComponent(activeFanId)}`, {
          credentials: 'include',
        })
        const json = (await res.json().catch(() => ({}))) as {
          fan?: { username?: string | null; display_name?: string | null }
        }
        if (!cancelled && json.fan) {
          setMeta({ username: json.fan.username, display_name: json.fan.display_name })
        } else if (!cancelled) {
          setMeta(null)
        }
      } catch {
        if (!cancelled) setMeta(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [activeFanId])

  useEffect(() => {
    if (!panel || collapsed) return
    let cancelled = false
    void fetch('/api/divine/content-list?limit=14&status=scheduled', { credentials: 'include' })
      .then((r) => r.json())
      .then((j: { content?: ScheduleItem[] }) => {
        if (!cancelled) setScheduleStrip(Array.isArray(j.content) ? j.content : [])
      })
      .catch(() => {
        if (!cancelled) setScheduleStrip([])
      })
    return () => {
      cancelled = true
    }
  }, [panel, collapsed])

  const conversation = useMemo(() => {
    if (!activeFanId) return null
    return {
      user: {
        id: activeFanId,
        username: meta?.username ?? '…',
        name: meta?.display_name ?? meta?.username ?? 'Fan',
        avatar: '',
      },
      lastMessage: {
        id: 'stub',
        text: '',
        createdAt: '1970-01-01T00:00:00.000Z',
        isRead: true,
      },
      unreadCount: 0,
      platform: 'onlyfans' as const,
    }
  }, [activeFanId, meta?.username, meta?.display_name])

  if (!panel || !activeFanId || !userId || !conversation) return null

  const title =
    meta?.display_name && meta?.username
      ? `${meta.display_name} (@${meta.username})`
      : meta?.username
        ? `@${meta.username}`
        : `Fan ${activeFanId.slice(0, 8)}…`

  return (
    <div
      className={cn(
        'fixed left-4 right-4 z-[45] flex flex-col rounded-lg border border-border bg-background shadow-2xl transition-all md:left-auto md:right-4 md:w-[min(100%,480px)]',
        collapsed ? 'top-4 max-h-12' : 'top-4 max-h-[min(85vh,720px)]',
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
        <p className="min-w-0 truncate text-sm font-medium">{title}</p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Fan profile"
            onClick={() => setProfileOpen(true)}
          >
            <User className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={collapsed ? 'Expand chat' : 'Collapse chat'}
            onClick={() => panel.setDmOverlayCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Close chat overlay"
            onClick={() => panel.closeDmOverlay()}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!collapsed && fanIds.length > 0 && (
        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-muted/20 px-2 py-1">
          {fanIds.map((id) => {
            const isActive = id === activeFanId
            return (
              <div
                key={id}
                className={cn(
                  'flex shrink-0 items-center rounded-md border',
                  isActive ? 'border-primary/50 bg-background' : 'border-transparent bg-muted/40',
                )}
              >
                <button
                  type="button"
                  className="max-w-[120px] truncate px-2 py-1 text-left text-[11px] font-medium text-foreground"
                  onClick={() => panel.setDmOverlayActiveFanId(id)}
                >
                  {id.slice(0, 10)}…
                </button>
                <button
                  type="button"
                  className="px-1 py-1 text-muted-foreground hover:text-foreground"
                  aria-label={`Close chat with fan ${id.slice(0, 8)}`}
                  onClick={() => panel.removeDmOverlayFan(id)}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {!collapsed && scheduleStrip.length > 0 && (
        <div className="shrink-0 border-b border-border bg-muted/10 px-2 py-1.5">
          <div className="mb-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            <Calendar className="h-3 w-3" />
            Scheduled content
          </div>
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {scheduleStrip.map((c) => (
              <span
                key={c.id}
                className="shrink-0 rounded border border-border/60 bg-card px-2 py-0.5 text-[10px] text-muted-foreground"
                title={c.title}
              >
                {c.title.slice(0, 28)}
                {c.title.length > 28 ? '…' : ''}
                {c.scheduled_at
                  ? ` · ${new Date(c.scheduled_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                  : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {!collapsed && (
        <div className="min-h-0 flex-1 overflow-hidden p-2">
          <div className="h-[min(60vh,560px)] overflow-hidden rounded-md border border-border/60 bg-card">
            <ChatWindow key={activeFanId} conversation={conversation} userId={userId} />
          </div>
        </div>
      )}
      <FanProfileModal
        open={profileOpen}
        onOpenChange={setProfileOpen}
        fanId={activeFanId}
        platform="onlyfans"
        initialUsername={meta?.username}
        initialName={meta?.display_name}
      />
    </div>
  )
}
