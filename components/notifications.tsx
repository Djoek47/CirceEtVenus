'use client'

import { useState, useEffect } from 'react'
import { Bell, Check, MessageSquare, Shield, TrendingUp, Users, X, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'

interface Notification {
  id: string
  type: 'message' | 'fan' | 'protection' | 'mention' | 'cosmic' | 'system'
  title: string
  description: string
  read: boolean
  created_at: string
  link?: string
}

const getIcon = (type: Notification['type']) => {
  switch (type) {
    case 'message':
      return <MessageSquare className="h-4 w-4 text-primary" />
    case 'fan':
      return <Users className="h-4 w-4 text-venus dark:text-venus" />
    case 'protection':
      return <Shield className="h-4 w-4 text-circe" />
    case 'mention':
      return <TrendingUp className="h-4 w-4 text-venus dark:text-venus" />
    case 'cosmic':
      return <Star className="h-4 w-4 text-primary" />
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />
  }
}

// Sample notifications for demo
const sampleNotifications: Notification[] = [
  {
    id: '1',
    type: 'cosmic',
    title: 'Cosmic Alignment',
    description: 'Venus enters Taurus - optimal time for luxury content',
    read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    link: '/dashboard/content'
  },
  {
    id: '2',
    type: 'fan',
    title: 'New Whale Alert',
    description: 'DiamondKing subscribed with $500 tip',
    read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    link: '/dashboard/fans'
  },
  {
    id: '3',
    type: 'protection',
    title: 'Circe Alert',
    description: 'Potential leak detected on external site',
    read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    link: '/dashboard/protection'
  },
  {
    id: '4',
    type: 'message',
    title: 'Unread Messages',
    description: 'You have 12 unread messages from fans',
    read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    link: '/dashboard/messages'
  },
  {
    id: '5',
    type: 'mention',
    title: 'Venus Insight',
    description: 'Positive review trending on Reddit',
    read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    link: '/dashboard/mentions'
  },
]

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>(sampleNotifications)
  const [open, setOpen] = useState(false)
  
  const unreadCount = notifications.filter(n => !n.read).length

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 sm:w-96" align="end">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="text-lg font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto px-2 py-1 text-xs"
              onClick={markAllAsRead}
            >
              Mark all read
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[300px] sm:h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={cn(
                    'relative flex gap-3 p-4 transition-colors hover:bg-muted/50',
                    !notification.read && 'bg-primary/5'
                  )}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {getIcon(notification.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <a 
                      href={notification.link || '#'} 
                      onClick={() => {
                        markAsRead(notification.id)
                        setOpen(false)
                      }}
                      className="block"
                    >
                      <p className={cn(
                        'text-sm',
                        !notification.read && 'font-medium'
                      )}>
                        {notification.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                        {notification.description}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground/70">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </a>
                  </div>
                  <div className="flex flex-shrink-0 gap-1">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => removeNotification(notification.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="border-t border-border p-2">
          <Button 
            variant="ghost" 
            className="w-full justify-center text-sm"
            onClick={() => setOpen(false)}
            asChild
          >
            <a href="/dashboard/settings">View all settings</a>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
