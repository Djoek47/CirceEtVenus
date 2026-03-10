'use client'

import { useState } from 'react'
import { ConversationList } from './conversation-list'
import { ChatWindow } from './chat-window'
import type { Conversation, Fan } from '@/lib/types'

interface ConversationWithFan extends Conversation {
  fan: Fan | null
}

interface MessagesLayoutProps {
  conversations: ConversationWithFan[]
  userId: string
}

export function MessagesLayout({ conversations, userId }: MessagesLayoutProps) {
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithFan | null>(
    conversations[0] || null
  )

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
            Connect your platforms to import your conversations and start chatting with fans.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Conversation List */}
      <ConversationList
        conversations={conversations}
        selectedId={selectedConversation?.id}
        onSelect={(conv) => setSelectedConversation(conv)}
      />

      {/* Chat Window */}
      <ChatWindow conversation={selectedConversation} userId={userId} />
    </div>
  )
}
