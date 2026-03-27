'use client'

import { useEffect, useMemo, useState } from 'react'
import { useDivinePanel } from '@/components/divine/divine-panel-context'
import { ChatWindow } from '@/components/messages/chat-window'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, User, X } from 'lucide-react'
import { FanProfileModal } from '@/components/messages/fan-profile-modal'
import { cn } from '@/lib/utils'

type FanMeta = { username?: string | null; display_name?: string | null }

export function DmChatOverlay() {
  const panel = useDivinePanel()
  const [meta, setMeta] = useState<FanMeta | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)

  const fanId = panel?.dmOverlayFanId ?? null
  const collapsed = panel?.dmOverlayCollapsed ?? false
  const userId = panel?.user?.id

  useEffect(() => {
    if (!fanId) {
      setMeta(null)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(`/api/divine/fan-recents?fanId=${encodeURIComponent(fanId)}`, {
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
  }, [fanId])

  // Stable identity: ChatWindow keys effects on conversation; a new object every render
  // (especially `new Date()` in lastMessage) caused infinite updates (React #185).
  // Must run before any early return (rules of hooks).
  const conversation = useMemo(() => {
    if (!fanId) return null
    return {
      user: {
        id: fanId,
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
  }, [fanId, meta?.username, meta?.display_name])

  if (!panel || !fanId || !userId || !conversation) return null

  const title =
    meta?.display_name && meta?.username
      ? `${meta.display_name} (@${meta.username})`
      : meta?.username
        ? `@${meta.username}`
        : `Fan ${fanId.slice(0, 8)}…`

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
      {!collapsed && (
        <div className="min-h-0 flex-1 overflow-hidden p-2">
          <div className="h-[min(60vh,560px)] overflow-hidden rounded-md border border-border/60 bg-card">
            <ChatWindow conversation={conversation} userId={userId} />
          </div>
        </div>
      )}
      <FanProfileModal
        open={profileOpen}
        onOpenChange={setProfileOpen}
        fanId={fanId}
        platform="onlyfans"
        initialUsername={meta?.username}
        initialName={meta?.display_name}
      />
    </div>
  )
}
