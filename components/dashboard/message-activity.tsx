'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowRight, MessageSquare, RefreshCw, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { stripHtmlForPreview } from '@/lib/html-utils'
import Image from 'next/image'

interface Conversation {
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
  platform: 'onlyfans' | 'fansly'
}

// Proxy OnlyFans CDN images
function proxyImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  if (url.includes('onlyfans.com') || url.includes('cdn2.onlyfans.com') || url.includes('cdn3.onlyfans.com')) {
    return `/api/proxy/image?url=${encodeURIComponent(url)}`
  }
  return url
}

// Format time ago
function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function MessageActivity() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchConversations = async (refresh = false) => {
    if (refresh) setIsRefreshing(true)
    else setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/onlyfans/conversations?limit=5')
      if (!response.ok) {
        throw new Error('Failed to fetch conversations')
      }
      const data = await response.json()
      
      // Add platform info to conversations
      const conversationsWithPlatform = (data.conversations || []).map((conv: any) => ({
        ...conv,
        platform: 'onlyfans' as const,
      }))
      
      setConversations(conversationsWithPlatform)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchConversations()
  }, [])

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0)

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Active Conversations
          </CardTitle>
          <CardDescription>
            {totalUnread > 0 ? `${totalUnread} unread messages` : 'Recent message activity'}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => fetchConversations(true)}
            disabled={isRefreshing}
            className="h-8 w-8"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          </Button>
          <Link href="/dashboard/messages">
            <Button variant="ghost" size="sm" className="gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 rounded-full bg-destructive/10 p-4">
              <MessageSquare className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-lg font-medium">Unable to Load Messages</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => fetchConversations()}>
              Try Again
            </Button>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No Conversations Yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Connect your platforms to see your messages here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.slice(0, 5).map((conv) => (
              <Link 
                key={`${conv.platform}-${conv.user.id}`}
                href={`/dashboard/messages?chat=${conv.user.id}&platform=${conv.platform}`}
                className="block"
              >
                <div className={cn(
                  'flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50',
                  conv.unreadCount > 0 && 'bg-primary/5'
                )}>
                  <div className="relative">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarImage src={proxyImageUrl(conv.user.avatar)} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {conv.user.name?.[0]?.toUpperCase() || conv.user.username?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    {/* Platform indicator */}
                    <div className="absolute -bottom-0.5 -right-0.5 rounded-full bg-background p-0.5 shadow-sm">
                      <Image 
                        src={conv.platform === 'onlyfans' ? '/onlyfans-logo.png' : '/fansly-logo.png'} 
                        alt={conv.platform} 
                        width={12} 
                        height={12} 
                        className="rounded-sm"
                      />
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn(
                        'font-medium truncate',
                        conv.unreadCount > 0 && 'text-foreground'
                      )}>
                        {conv.user.name || conv.user.username || 'Unknown'}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {conv.lastMessage?.createdAt && timeAgo(conv.lastMessage.createdAt)}
                      </span>
                    </div>
                    <p className={cn(
                      'text-sm truncate',
                      conv.unreadCount > 0 ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {stripHtmlForPreview(conv.lastMessage?.text) || 'Media message'}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
