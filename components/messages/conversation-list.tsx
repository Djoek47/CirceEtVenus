'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { stripHtmlForPreview } from '@/lib/html-utils'

// Proxy OnlyFans CDN images through our server to avoid CORS/403 issues
function proxyImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  if (url.includes('onlyfans.com') || url.includes('cdn2.onlyfans.com') || url.includes('cdn3.onlyfans.com')) {
    return `/api/proxy/image?url=${encodeURIComponent(url)}`
  }
  return url
}

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

interface ConversationListProps {
  conversations: OnlyFansConversation[]
  selectedId?: string
  onSelect: (conversation: OnlyFansConversation) => void
}

export function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('search') ?? ''
  const [searchQuery, setSearchQuery] = useState(initialQuery)

  const filteredConversations = conversations.filter((conv) =>
    conv.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.user.username?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getTimeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (seconds < 60) return 'now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    return `${days}d`
  }

  return (
    <Card className="flex w-full md:w-80 flex-shrink-0 flex-col border-border bg-card min-h-0">
      <CardHeader className="border-b border-border pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Messages</CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search conversations..." 
            className="bg-input pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-2">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </p>
            {!searchQuery && (
              <p className="text-xs text-muted-foreground mt-1">Messages from fans will appear here</p>
            )}
          </div>
        ) : (
        <div className="space-y-1">
          {filteredConversations.map((conv) => (
            <button
              key={conv.user.id}
              onClick={() => onSelect(conv)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors',
                selectedId === conv.user.id
                  ? 'bg-secondary'
                  : 'hover:bg-secondary/50'
              )}
            >
              <div className="relative">
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarImage src={proxyImageUrl(conv.user.avatar) || conv.user.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {conv.user.name?.[0]?.toUpperCase() || conv.user.username?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                {conv.unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                    {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                  </span>
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    'font-medium truncate',
                    conv.unreadCount > 0 && 'text-foreground'
                  )}>
                    {conv.user.name || conv.user.username || 'Unknown'}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                    {conv.lastMessage?.createdAt ? getTimeAgo(conv.lastMessage.createdAt) : ''}
                  </span>
                </div>
                <p className={cn(
                  'text-sm truncate mt-0.5',
                  conv.unreadCount > 0 ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {stripHtmlForPreview(conv.lastMessage?.text) || 'Media message'}
                </p>
              </div>
            </button>
          ))}
        </div>
        )}
      </CardContent>
    </Card>
  )
}
