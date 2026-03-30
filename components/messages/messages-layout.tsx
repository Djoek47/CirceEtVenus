'use client'

import { Suspense, useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ConversationList, conversationRowKey, type Conversation } from './conversation-list'
import { ChatWindow } from './chat-window'
import { MassMessageDialog } from './mass-message-dialog'
import { MessageEngagementInsights } from './message-engagement-insights'
import { Button } from '@/components/ui/button'
import { RefreshCw, Loader2, ArrowLeft, BarChart3, MessageSquare, Megaphone } from 'lucide-react'
import { useDivinePanel } from '@/components/divine/divine-panel-context'

type MessagesView = 'conversations' | 'insights'

interface MessagesLayoutProps {
  userId: string
  /** From server: `?fanId=` (voice/Divine) or `?chat=` (dashboard links) on first paint. */
  initialFanId?: string
  /** From server: `?platform=onlyfans|fansly` when using `chat=`. */
  initialPlatform?: string
}

function pickConversationForDeepLink(
  list: Conversation[],
  fanId: string,
  platform?: string | null,
): Conversation | undefined {
  const id = String(fanId)
  const sameId = list.filter((c) => String(c.user.id) === id)
  if (sameId.length === 0) return undefined
  if (platform === 'onlyfans' || platform === 'fansly') {
    return sameId.find((c) => c.platform === platform) ?? sameId[0]
  }
  return sameId[0]
}

function MessagesLayoutContent({ userId, initialFanId, initialPlatform }: MessagesLayoutProps) {
  const searchParams = useSearchParams()
  const divinePanel = useDivinePanel()
  const fanIdFromUrl =
    searchParams.get('fanId') ?? searchParams.get('chat') ?? initialFanId ?? undefined
  const platformFromUrl =
    searchParams.get('platform') ?? initialPlatform ?? undefined
  // Prefer explicit voice focus first; fallback to URL deep-link.
  const preferredFanIdRef = useRef<string | undefined>(undefined)
  preferredFanIdRef.current = divinePanel?.focusedFan?.id ?? fanIdFromUrl
  const preferredPlatformRef = useRef<string | undefined>(undefined)
  preferredPlatformRef.current = divinePanel?.focusedFan?.id ? undefined : platformFromUrl
  const [view, setView] = useState<MessagesView>('conversations')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const selectedRef = useRef<Conversation | null>(null)
  selectedRef.current = selectedConversation
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadConversations = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const [onlyfansRes, fanslyRes] = await Promise.all([
        fetch('/api/onlyfans/conversations'),
        fetch('/api/fansly/conversations'),
      ])
      const [onlyfansData, fanslyData] = await Promise.all([
        onlyfansRes.json(),
        fanslyRes.json(),
      ])

      const allConversations: Conversation[] = []

      if (onlyfansRes.ok && onlyfansData.conversations) {
        const ofConversations = onlyfansData.conversations.map((conv: any) => ({
          ...conv,
          platform: 'onlyfans' as const,
          chatId: conv.chatId || conv.user?.id,
        }))
        allConversations.push(...ofConversations)
      }

      if (fanslyRes.ok && fanslyData.conversations?.length) {
        const fanslyConversations = fanslyData.conversations.map((conv: any) => ({
          ...conv,
          platform: 'fansly' as const,
          chatId: conv.chatId || conv.user?.id,
        }))
        allConversations.push(...fanslyConversations)
      }

      // Sort by most recent message
      allConversations.sort((a, b) => {
        const dateA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0
        const dateB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0
        return dateB - dateA
      })

      setConversations(allConversations)
      setSelectedConversation((prev) => {
        if (allConversations.length === 0) return null
        const preferredFanId = preferredFanIdRef.current
        if (preferredFanId) {
          const preferred = pickConversationForDeepLink(
            allConversations,
            preferredFanId,
            preferredPlatformRef.current,
          )
          if (preferred) return preferred
        }
        if (!prev) return allConversations[0]
        const stillThere = allConversations.find((c) => String(c.user.id) === String(prev.user.id))
        return stillThere ?? allConversations[0]
      })
      if (allConversations.length > 0) {
        void fetch('/api/divine/fan-recents', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rows: allConversations.map((c) => ({
              fanId: String(c.user.id),
              username: c.user.username,
              displayName: c.user.name,
              platform: c.platform,
            })),
          }),
        }).catch(() => undefined)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // Open the thread for ?fanId= / ?chat= or Divine voice/chat "focus fan"
  useEffect(() => {
    if (!fanIdFromUrl || conversations.length === 0) return
    const match = pickConversationForDeepLink(conversations, fanIdFromUrl, platformFromUrl)
    if (!match) return
    const cur = selectedRef.current
    if (
      cur &&
      String(cur.user.id) === String(match.user.id) &&
      cur.platform === match.platform
    ) {
      return
    }
    setSelectedConversation(match)
  }, [fanIdFromUrl, platformFromUrl, conversations])

  useEffect(() => {
    const id = divinePanel?.focusedFan?.id
    if (!id || conversations.length === 0) return
    if (selectedRef.current && String(selectedRef.current.user.id) === String(id)) return
    const match = conversations.find((c) => String(c.user.id) === String(id))
    if (!match) return
    setSelectedConversation(match)
  }, [divinePanel?.focusedFan?.id, conversations])

  const threadInsightDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const conv = selectedConversation
    let id: string | null = null
    let platform: 'onlyfans' | 'fansly' = 'onlyfans'
    if (conv?.platform === 'onlyfans') {
      id = String(conv.user.id)
      platform = 'onlyfans'
    } else if (conv?.platform === 'fansly') {
      id = String(conv.user.id)
      platform = 'fansly'
    } else if (!conv && fanIdFromUrl) {
      // Deep link (?fanId=) while conversations still loading — same debounced refresh as overlay/Divine focus
      id = String(fanIdFromUrl)
    }
    if (!id) return
    if (threadInsightDebounceRef.current) clearTimeout(threadInsightDebounceRef.current)
    threadInsightDebounceRef.current = setTimeout(() => {
      void fetch('/api/divine/refresh-thread-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fanId: id, platform }),
      }).catch(() => undefined)
    }, 25_000)
    return () => {
      if (threadInsightDebounceRef.current) clearTimeout(threadInsightDebounceRef.current)
    }
    // Omit full `selectedConversation` — new object refs from refresh would retrigger unnecessarily.
  }, [selectedConversation?.user.id, selectedConversation?.platform, fanIdFromUrl])

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="flex flex-col items-center text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 rounded-full bg-destructive/10 p-4">
            <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium">Failed to Load Messages</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => loadConversations()} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium">No Messages Yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Your messages will appear here once fans start messaging you. Connect OnlyFans or Fansly in Settings to see conversations.
          </p>
          <Button onClick={() => loadConversations(true)} className="mt-4" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-col h-[calc(100dvh-7rem)] max-h-[calc(100dvh-7rem)] sm:h-[calc(100vh-8rem)] sm:max-h-none">
      {/* Header: back on mobile when chat open, title, view toggle, actions */}
      <div className="mb-2 flex flex-shrink-0 flex-wrap items-center justify-between gap-2 sm:mb-4">
        <div className="flex items-center gap-2 min-w-0">
          {selectedConversation && view === 'conversations' && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-10 w-10 flex-shrink-0"
              onClick={() => setSelectedConversation(null)}
              aria-label="Back to conversations"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
              {view === 'insights' ? 'Message insights' : selectedConversation ? (selectedConversation.user.name || selectedConversation.user.username || 'Chat') : 'Messages'}
            </h2>
            <p className="text-sm text-muted-foreground truncate">
              {view === 'insights' ? 'Direct & mass message performance' : selectedConversation ? `@${selectedConversation.user.username}` : `${conversations.length} conversations · OnlyFans & Fansly`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex rounded-md border border-border p-0.5">
            <Button
              variant={view === 'conversations' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setView('conversations')}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Chats
            </Button>
            <Button
              variant={view === 'insights' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setView('insights')}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Insights
            </Button>
          </div>
          {view === 'conversations' && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10"
                onClick={() => loadConversations(true)}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="outline" size="sm" className="hidden gap-1.5 sm:inline-flex" asChild>
                <Link href="/dashboard/messages/mass">
                  <Megaphone className="h-4 w-4" />
                  Mass page
                </Link>
              </Button>
              <MassMessageDialog />
            </>
          )}
        </div>
      </div>

      {view === 'insights' ? (
        <div className="flex-1 min-h-0 overflow-auto">
          <MessageEngagementInsights />
        </div>
      ) : (
        <>
          {/* Desktop: side-by-side list + chat */}
          <div className="hidden md:flex flex-1 gap-4 min-h-0">
            <ConversationList
              conversations={conversations}
              selectedKey={
                selectedConversation ? conversationRowKey(selectedConversation) : undefined
              }
              onSelect={(conv) => setSelectedConversation(conv)}
            />
            <ChatWindow
              conversation={selectedConversation}
              userId={userId}
              onMessageSent={() => loadConversations(true)}
            />
          </div>

          {/* Mobile: list or chat (full width) */}
          <div className="flex flex-1 flex-col min-h-0 md:hidden">
            {selectedConversation ? (
              <ChatWindow
                conversation={selectedConversation}
                userId={userId}
                onMessageSent={() => loadConversations(true)}
              />
            ) : (
              <ConversationList
                conversations={conversations}
                selectedKey={
                  selectedConversation ? conversationRowKey(selectedConversation) : undefined
                }
                onSelect={(conv) => setSelectedConversation(conv)}
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}

function MessagesLoadingShell() {
  return (
    <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
    </div>
  )
}

export function MessagesLayout(props: MessagesLayoutProps) {
  return (
    <Suspense fallback={<MessagesLoadingShell />}>
      <MessagesLayoutContent {...props} />
    </Suspense>
  )
}
