'use client'

import { useState, useEffect, useCallback } from 'react'
import { ConversationList } from './conversation-list'
import { ChatWindow } from './chat-window'
import { MassMessageDialog } from './mass-message-dialog'
import { Button } from '@/components/ui/button'
import { RefreshCw, Loader2 } from 'lucide-react'

interface OnlyFansConversation {
  user: {
    id: string
    username: string
    name: string
    avatar: string
  }
  lastMessage: {
    id: string
    text: string
    createdAt: string
    isRead: boolean
  }
  unreadCount: number
}

interface MessagesLayoutProps {
  userId: string
}

export function MessagesLayout({ userId }: MessagesLayoutProps) {
  const [conversations, setConversations] = useState<OnlyFansConversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<OnlyFansConversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadConversations = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/onlyfans/conversations')
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load conversations')
      }

      setConversations(data.conversations || [])
      if (data.conversations?.length > 0 && !selectedConversation) {
        setSelectedConversation(data.conversations[0])
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
            Your OnlyFans messages will appear here once fans start messaging you.
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
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header with Mass Message */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Messages</h2>
          <p className="text-sm text-muted-foreground">
            {conversations.length} conversations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => loadConversations(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <MassMessageDialog />
        </div>
      </div>

      {/* Messages Content */}
      <div className="flex flex-1 gap-4 min-h-0">
        {/* Conversation List */}
        <ConversationList
          conversations={conversations}
          selectedId={selectedConversation?.user.id}
          onSelect={(conv) => setSelectedConversation(conv)}
        />

        {/* Chat Window */}
        <ChatWindow 
          conversation={selectedConversation} 
          userId={userId}
          onMessageSent={() => loadConversations(true)}
        />
      </div>
    </div>
  )
}
