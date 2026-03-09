'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Send, Paperclip, DollarSign, MoreVertical, Star, Ban, User, Mic } from 'lucide-react'
import { VoiceInputButton } from '@/components/voice-input-button'
import { cn } from '@/lib/utils'
import type { Conversation, Fan, Message } from '@/lib/types'

interface ConversationWithFan extends Conversation {
  fan: Fan | null
}

interface ChatWindowProps {
  conversation: ConversationWithFan | null
  userId: string
}

const tierColors = {
  whale: 'bg-primary/20 text-primary border-primary/30',
  regular: 'bg-chart-2/20 text-chart-2 border-chart-2/30',
  new: 'bg-chart-4/20 text-chart-4 border-chart-4/30',
  inactive: 'bg-muted text-muted-foreground border-border',
}

export function ChatWindow({ conversation }: ChatWindowProps) {
  const [message, setMessage] = useState('')
  const [messages] = useState<Message[]>(generateSampleMessages())

  if (!conversation) {
    return (
      <Card className="flex flex-1 items-center justify-center border-border bg-card">
        <div className="text-center text-muted-foreground">
          <p>Select a conversation to start messaging</p>
        </div>
      </Card>
    )
  }

  const fan = conversation.fan

  return (
    <Card className="flex flex-1 flex-col border-border bg-card">
      {/* Chat Header */}
      <CardHeader className="flex flex-row items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-border">
            <AvatarImage src={fan?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {fan?.display_name?.[0] || fan?.platform_username?.[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {fan?.display_name || fan?.platform_username || 'Unknown'}
              </span>
              {fan?.is_favorite && (
                <Star className="h-4 w-4 fill-chart-4 text-chart-4" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn('text-xs capitalize', fan?.tier && tierColors[fan.tier])}
              >
                {fan?.tier || 'unknown'}
              </Badge>
              <span className="text-xs text-muted-foreground">
                ${fan?.total_spent?.toLocaleString() || 0} spent
              </span>
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              View Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Star className="mr-2 h-4 w-4" />
              {fan?.is_favorite ? 'Remove Favorite' : 'Add to Favorites'}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Ban className="mr-2 h-4 w-4" />
              Block User
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex',
                msg.sender_type === 'creator' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[70%] rounded-2xl px-4 py-2',
                  msg.sender_type === 'creator'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground'
                )}
              >
                <p className="text-sm">{msg.content}</p>
                {msg.is_ppv && msg.ppv_price && (
                  <Badge className="mt-2 bg-chart-4/20 text-chart-4">
                    <DollarSign className="mr-1 h-3 w-3" />
                    PPV ${msg.ppv_price}
                  </Badge>
                )}
                <p
                  className={cn(
                    'mt-1 text-xs',
                    msg.sender_type === 'creator'
                      ? 'text-primary-foreground/70'
                      : 'text-muted-foreground'
                  )}
                >
                  {new Date(msg.sent_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      {/* Message Input */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="flex-shrink-0">
            <Paperclip className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="flex-shrink-0">
            <DollarSign className="h-5 w-5" />
          </Button>
          <div className="relative flex-1">
            <Input
              placeholder="Type or speak a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-input pr-10"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && message.trim()) {
                  setMessage('')
                }
              }}
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2">
              <VoiceInputButton
                onTranscript={(text) => setMessage(prev => prev + (prev ? ' ' : '') + text)}
                size="sm"
                variant="ghost"
              />
            </div>
          </div>
          <Button size="icon" disabled={!message.trim()}>
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </Card>
  )
}

function generateSampleMessages(): Message[] {
  const now = Date.now()
  return [
    {
      id: '1',
      conversation_id: '1',
      sender_type: 'fan',
      content: 'Hey! Love your content! When is the next exclusive dropping?',
      media_urls: [],
      is_ppv: false,
      ppv_price: null,
      is_read: true,
      sent_at: new Date(now - 1000 * 60 * 30).toISOString(),
    },
    {
      id: '2',
      conversation_id: '1',
      sender_type: 'creator',
      content: 'Thank you so much! I have something special coming this weekend. Stay tuned!',
      media_urls: [],
      is_ppv: false,
      ppv_price: null,
      is_read: true,
      sent_at: new Date(now - 1000 * 60 * 25).toISOString(),
    },
    {
      id: '3',
      conversation_id: '1',
      sender_type: 'fan',
      content: 'Can I get a sneak peek? Would love to see what you are working on!',
      media_urls: [],
      is_ppv: false,
      ppv_price: null,
      is_read: true,
      sent_at: new Date(now - 1000 * 60 * 20).toISOString(),
    },
    {
      id: '4',
      conversation_id: '1',
      sender_type: 'creator',
      content: 'Sure thing! Here is an exclusive preview just for you...',
      media_urls: ['/images/preview.jpg'],
      is_ppv: true,
      ppv_price: 15,
      is_read: true,
      sent_at: new Date(now - 1000 * 60 * 15).toISOString(),
    },
    {
      id: '5',
      conversation_id: '1',
      sender_type: 'fan',
      content: 'Amazing! Just purchased. You are the best!',
      media_urls: [],
      is_ppv: false,
      ppv_price: null,
      is_read: false,
      sent_at: new Date(now - 1000 * 60 * 5).toISOString(),
    },
  ]
}
