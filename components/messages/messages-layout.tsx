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

  const displayConversations = conversations.length > 0 ? conversations : generateSampleConversations()

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Conversation List */}
      <ConversationList
        conversations={displayConversations}
        selectedId={selectedConversation?.id}
        onSelect={(conv) => setSelectedConversation(conv)}
      />

      {/* Chat Window */}
      <ChatWindow conversation={selectedConversation} userId={userId} />
    </div>
  )
}

function generateSampleConversations(): ConversationWithFan[] {
  return [
    {
      id: '1',
      user_id: '',
      fan_id: '1',
      platform: 'onlyfans',
      status: 'active',
      last_message_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      unread_count: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      fan: {
        id: '1',
        user_id: '',
        platform: 'onlyfans',
        platform_username: 'superfan123',
        display_name: 'Super Fan',
        avatar_url: null,
        tier: 'whale',
        total_spent: 2500,
        subscription_start: null,
        last_interaction: null,
        notes: null,
        tags: [],
        is_favorite: true,
        is_blocked: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    },
    {
      id: '2',
      user_id: '',
      fan_id: '2',
      platform: 'fansly',
      status: 'active',
      last_message_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      unread_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      fan: {
        id: '2',
        user_id: '',
        platform: 'fansly',
        platform_username: 'loyalfan',
        display_name: 'Loyal Supporter',
        avatar_url: null,
        tier: 'regular',
        total_spent: 450,
        subscription_start: null,
        last_interaction: null,
        notes: null,
        tags: [],
        is_favorite: false,
        is_blocked: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    },
    {
      id: '3',
      user_id: '',
      fan_id: '3',
      platform: 'mym',
      status: 'pending',
      last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      unread_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      fan: {
        id: '3',
        user_id: '',
        platform: 'mym',
        platform_username: 'newbie99',
        display_name: 'New Subscriber',
        avatar_url: null,
        tier: 'new',
        total_spent: 25,
        subscription_start: null,
        last_interaction: null,
        notes: null,
        tags: [],
        is_favorite: false,
        is_blocked: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    },
  ]
}
