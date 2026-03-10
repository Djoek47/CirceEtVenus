'use client'

import { useState, useEffect, useRef } from 'react'
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
import { Send, Paperclip, DollarSign, MoreVertical, User, Loader2, RefreshCw } from 'lucide-react'
import { VoiceInputButton } from '@/components/voice-input-button'
import { cn } from '@/lib/utils'

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

interface OnlyFansMessage {
  id: string
  fromUser: {
    id: string
    username: string
    name: string
    avatar: string
  }
  text: string
  createdAt: string
  isRead: boolean
  media: {
    id: string
    type: 'photo' | 'video'
    url: string
    preview: string
  }[]
  price: number | null
  isPaid: boolean
}

interface ChatWindowProps {
  conversation: OnlyFansConversation | null
  userId: string
  onMessageSent?: () => void
}

export function ChatWindow({ conversation, onMessageSent }: ChatWindowProps) {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<OnlyFansMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Load messages when conversation changes
  useEffect(() => {
    if (!conversation) {
      setMessages([])
      return
    }

    const loadMessages = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const res = await fetch(`/api/onlyfans/messages/${conversation.user.id}`)
        const data = await res.json()
        
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load messages')
        }
        
        setMessages(data.messages || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load messages')
      } finally {
        setLoading(false)
      }
    }

    loadMessages()
  }, [conversation])

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!message.trim() || !conversation || sending) return
    
    setSending(true)
    const messageText = message
    setMessage('')
    
    try {
      const res = await fetch(`/api/onlyfans/messages/${conversation.user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: messageText }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message')
      }
      
      // Add the sent message to the list
      if (data.message) {
        setMessages(prev => [...prev, data.message])
      }
      
      // Notify parent to refresh conversation list
      onMessageSent?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
      setMessage(messageText) // Restore message on error
    } finally {
      setSending(false)
    }
  }

  if (!conversation) {
    return (
      <Card className="flex flex-1 items-center justify-center border-border bg-card">
        <div className="flex flex-col items-center text-center text-muted-foreground">
          <svg className="mb-4 h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p>Select a conversation to start messaging</p>
        </div>
      </Card>
    )
  }

  const fan = conversation.user

  return (
    <Card className="flex flex-1 flex-col border-border bg-card">
      {/* Chat Header */}
      <CardHeader className="flex flex-row items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-border">
            <AvatarImage src={fan.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {fan.name?.[0]?.toUpperCase() || fan.username?.[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {fan.name || fan.username || 'Unknown'}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">@{fan.username}</span>
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
            <DropdownMenuItem onClick={() => {
              setLoading(true)
              fetch(`/api/onlyfans/messages/${conversation.user.id}`)
                .then(res => res.json())
                .then(data => setMessages(data.messages || []))
                .finally(() => setLoading(false))
            }}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Messages
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => {
                setError(null)
                setLoading(true)
                fetch(`/api/onlyfans/messages/${conversation.user.id}`)
                  .then(res => res.json())
                  .then(data => setMessages(data.messages || []))
                  .catch(e => setError(e.message))
                  .finally(() => setLoading(false))
              }}
            >
              Try Again
            </Button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground">Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isCreator = msg.fromUser.id !== conversation.user.id
              return (
                <div
                  key={msg.id}
                  className={cn(
                    'flex',
                    isCreator ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[70%] rounded-2xl px-4 py-2',
                      isCreator
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    )}
                  >
                    {msg.media && msg.media.length > 0 && (
                      <div className="mb-2 space-y-2">
                        {msg.media.map((m) => (
                          <div key={m.id} className="relative">
                            {m.type === 'photo' ? (
                              <img 
                                src={m.preview || m.url} 
                                alt="Media" 
                                className="rounded-lg max-w-full"
                              />
                            ) : (
                              <video 
                                src={m.url} 
                                poster={m.preview}
                                controls 
                                className="rounded-lg max-w-full"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {msg.text && <p className="text-sm">{msg.text}</p>}
                    {msg.price && !msg.isPaid && (
                      <Badge className="mt-2 bg-chart-4/20 text-chart-4">
                        <DollarSign className="mr-1 h-3 w-3" />
                        PPV ${msg.price}
                      </Badge>
                    )}
                    <p
                      className={cn(
                        'mt-1 text-xs',
                        isCreator
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                      )}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </CardContent>

      {/* Message Input */}
      <div className="border-t border-border p-4">
        {error && (
          <p className="text-xs text-destructive mb-2">{error}</p>
        )}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="flex-shrink-0">
            <Paperclip className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="flex-shrink-0">
            <DollarSign className="h-5 w-5" />
          </Button>
          <div className="relative flex-1">
            <Input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-input pr-10"
              disabled={sending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && message.trim()) {
                  e.preventDefault()
                  handleSendMessage()
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
          <Button 
            size="icon" 
            disabled={!message.trim() || sending}
            onClick={handleSendMessage}
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  )
}
