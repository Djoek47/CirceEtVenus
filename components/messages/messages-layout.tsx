'use client'

import { useState, useEffect, useCallback } from 'react'
import { ConversationList, type Conversation } from './conversation-list'
import { ChatWindow } from './chat-window'
import { MassMessageDialog } from './mass-message-dialog'
import { Button } from '@/components/ui/button'
import { RefreshCw, Loader2, ArrowLeft } from 'lucide-react'

interface MessagesLayoutProps {
  userId: string
}

export function MessagesLayout({ userId }: MessagesLayoutProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadConversations = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      // Fetch from OnlyFans
      const onlyfansRes = await fetch('/api/onlyfans/conversations')
      const onlyfansData = await onlyfansRes.json()

      const allConversations: Conversation[] = []

      // Add OnlyFans conversations with platform tag
      if (onlyfansRes.ok && onlyfansData.conversations) {
        const ofConversations = onlyfansData.conversations.map((conv: any) => ({
          ...conv,
          platform: 'onlyfans' as const,
          chatId: conv.chatId || conv.user?.id,
        }))
        allConversations.push(...ofConversations)
      }

      // TODO: Add Fansly conversations when API is available
      // const fanslyRes = await fetch('/api/fansly/conversations')
      // if (fanslyRes.ok) {
      //   const fanslyData = await fanslyRes.json()
      //   const fanslyConversations = fanslyData.conversations.map((conv: any) => ({
      //     ...conv,
      //     platform: 'fansly' as const,
      //   }))
      //   allConversations.push(...fanslyConversations)
      // }

      // Sort by most recent message
      allConversations.sort((a, b) => {
        const dateA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0
        const dateB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0
        return dateB - dateA
      })

      setConversations(allConversations)
      if (allConversations.length > 0 && !selectedConversation) {
        setSelectedConversation(allConversations[0])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedConversation])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

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
            Your messages will appear here once fans start messaging you.
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
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-0">
      {/* Header: back on mobile when chat open, title, actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {selectedConversation && (
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
              {selectedConversation ? (selectedConversation.user.name || selectedConversation.user.username || 'Chat') : 'Messages'}
            </h2>
            <p className="text-sm text-muted-foreground truncate">
              {selectedConversation ? `@${selectedConversation.user.username}` : `${conversations.length} conversations`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10"
            onClick={() => loadConversations(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <MassMessageDialog />
        </div>
      </div>

      {/* Desktop: side-by-side list + chat */}
      <div className="hidden md:flex flex-1 gap-4 min-h-0">
        <ConversationList
          conversations={conversations}
          selectedId={selectedConversation?.user.id}
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
            selectedId={selectedConversation?.user.id}
            onSelect={(conv) => setSelectedConversation(conv)}
          />
        )}
      </div>
    </div>
  )
}
