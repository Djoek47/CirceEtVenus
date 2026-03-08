'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Image, Video, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Content } from '@/lib/types'

interface ContentCalendarProps {
  content: Content[]
}

const statusColors = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-chart-4/20 text-chart-4',
  published: 'bg-chart-2/20 text-chart-2',
  archived: 'bg-secondary text-secondary-foreground',
}

export function ContentCalendar({ content }: ContentCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  
  const displayContent = content.length > 0 ? content : generateSampleContent()

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const startingDayOfWeek = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  const days = []
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const getContentForDay = (day: number) => {
    return displayContent.filter((c) => {
      if (!c.scheduled_at) return false
      const contentDate = new Date(c.scheduled_at)
      return (
        contentDate.getDate() === day &&
        contentDate.getMonth() === month &&
        contentDate.getFullYear() === year
      )
    })
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4">
        {/* Calendar Header */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {monthNames[month]} {year}
          </h3>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Day Names */}
        <div className="mb-2 grid grid-cols-7 gap-1">
          {dayNames.map((day) => (
            <div
              key={day}
              className="p-2 text-center text-xs font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            const dayContent = day ? getContentForDay(day) : []
            const isToday =
              day === new Date().getDate() &&
              month === new Date().getMonth() &&
              year === new Date().getFullYear()

            return (
              <div
                key={index}
                className={cn(
                  'min-h-[100px] rounded-lg border border-border p-2 transition-colors',
                  day ? 'hover:border-primary/50' : 'bg-secondary/20',
                  isToday && 'border-primary bg-primary/5'
                )}
              >
                {day && (
                  <>
                    <span
                      className={cn(
                        'text-sm font-medium',
                        isToday && 'text-primary'
                      )}
                    >
                      {day}
                    </span>
                    <div className="mt-1 space-y-1">
                      {dayContent.slice(0, 2).map((c) => (
                        <div
                          key={c.id}
                          className="group flex cursor-pointer items-center gap-1 rounded bg-secondary/50 p-1 transition-colors hover:bg-secondary"
                        >
                          {c.media_urls.length > 0 ? (
                            c.media_urls[0].includes('video') ? (
                              <Video className="h-3 w-3 text-muted-foreground" />
                            ) : (
                              <Image className="h-3 w-3 text-muted-foreground" />
                            )
                          ) : (
                            <FileText className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span className="line-clamp-1 text-xs">{c.title}</span>
                        </div>
                      ))}
                      {dayContent.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{dayContent.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 border-t border-border pt-4">
          {Object.entries(statusColors).map(([status, color]) => (
            <div key={status} className="flex items-center gap-2">
              <div className={cn('h-3 w-3 rounded', color)} />
              <span className="text-xs capitalize text-muted-foreground">{status}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function generateSampleContent(): Content[] {
  const today = new Date()
  return [
    {
      id: '1',
      user_id: '',
      title: 'Morning photoshoot',
      description: 'Beach sunset photos',
      media_urls: ['/images/photo1.jpg'],
      platforms: ['onlyfans', 'fansly'],
      status: 'scheduled',
      scheduled_at: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 10, 0).toISOString(),
      published_at: null,
      performance_metrics: { views: 0, likes: 0, comments: 0, shares: 0, revenue: 0 },
      tags: ['photo', 'beach'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '2',
      user_id: '',
      title: 'Exclusive video',
      description: 'Behind the scenes',
      media_urls: ['/videos/bts.mp4'],
      platforms: ['onlyfans'],
      status: 'scheduled',
      scheduled_at: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 14, 0).toISOString(),
      published_at: null,
      performance_metrics: { views: 0, likes: 0, comments: 0, shares: 0, revenue: 0 },
      tags: ['video', 'exclusive'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '3',
      user_id: '',
      title: 'Weekly update post',
      description: 'Catching up with fans',
      media_urls: [],
      platforms: ['onlyfans', 'mym', 'fansly'],
      status: 'draft',
      scheduled_at: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 12, 0).toISOString(),
      published_at: null,
      performance_metrics: { views: 0, likes: 0, comments: 0, shares: 0, revenue: 0 },
      tags: ['text', 'update'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '4',
      user_id: '',
      title: 'PPV Special',
      description: 'Premium content drop',
      media_urls: ['/images/special.jpg', '/videos/special.mp4'],
      platforms: ['onlyfans'],
      status: 'scheduled',
      scheduled_at: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 18, 0).toISOString(),
      published_at: null,
      performance_metrics: { views: 0, likes: 0, comments: 0, shares: 0, revenue: 0 },
      tags: ['ppv', 'premium'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]
}
