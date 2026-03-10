'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, Plus, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Conversation, Fan } from '@/lib/types'

interface ConversationWithFan extends Conversation {
  fan: Fan | null
}

interface ConversationListProps {
  conversations: ConversationWithFan[]
  selectedId?: string
  onSelect: (conversation: ConversationWithFan) => void
}

const platformColors = {
  onlyfans: 'bg-[#00AFF0]/20 text-[#00AFF0]',
  mym: 'bg-[#FF4D67]/20 text-[#FF4D67]',
  fansly: 'bg-[#009FFF]/20 text-[#009FFF]',
}

export function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
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
    <Card className="flex w-80 flex-shrink-0 flex-col border-border bg-card">
      <CardHeader className="border-b border-border pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Messages</CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search conversations..." className="bg-input pl-9" />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">No conversations yet</p>
            <p className="text-xs text-muted-foreground mt-1">Connect platforms to sync messages</p>
          </div>
        ) : (
        <div className="space-y-1">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors',
                selectedId === conv.id
                  ? 'bg-secondary'
                  : 'hover:bg-secondary/50'
              )}
            >
              <div className="relative">
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarImage src={conv.fan?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {conv.fan?.display_name?.[0] || conv.fan?.platform_username?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                {conv.unread_count > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                    {conv.unread_count}
                  </span>
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 font-medium">
                    {conv.fan?.display_name || conv.fan?.platform_username || 'Unknown'}
                    {conv.fan?.is_favorite && (
                      <Star className="h-3 w-3 fill-chart-4 text-chart-4" />
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {conv.last_message_at ? getTimeAgo(conv.last_message_at) : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={cn('text-[10px]', platformColors[conv.platform])}
                  >
                    {conv.platform.toUpperCase()}
                  </Badge>
                  {conv.fan?.tier === 'whale' && (
                    <Badge variant="outline" className="text-[10px] border-primary/30 bg-primary/10 text-primary">
                      WHALE
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
        )}
      </CardContent>
    </Card>
  )
}
