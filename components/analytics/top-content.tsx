'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Image, Video, FileText, Eye, DollarSign } from 'lucide-react'
import type { Content } from '@/lib/types'

interface TopContentProps {
  content: Content[]
}

export function TopContent({ content }: TopContentProps) {
  const displayContent = content.length > 0 ? content.slice(0, 5) : generateSampleContent()

  const getIcon = (c: Content) => {
    if (c.media_urls.length === 0) return FileText
    if (c.media_urls.some(url => url.includes('video'))) return Video
    return Image
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>Top Performing Content</CardTitle>
        <CardDescription>Your best content by engagement</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayContent.map((c, index) => {
            const Icon = getIcon(c)
            return (
              <div key={c.id} className="flex items-center gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-lg font-bold text-muted-foreground">
                  {index + 1}
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{c.title}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {c.performance_metrics.views.toLocaleString()}
                    </span>
                    {c.performance_metrics.revenue > 0 && (
                      <Badge variant="outline" className="text-chart-2 border-chart-2/30">
                        <DollarSign className="mr-1 h-3 w-3" />
                        {c.performance_metrics.revenue}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function generateSampleContent(): Content[] {
  return [
    {
      id: '1',
      user_id: '',
      title: 'Beach Sunset Photoshoot',
      description: 'Exclusive photos from the beach',
      media_urls: ['/images/beach.jpg'],
      platforms: ['onlyfans'],
      status: 'published',
      scheduled_at: null,
      published_at: new Date().toISOString(),
      performance_metrics: { views: 5420, likes: 342, comments: 89, shares: 12, revenue: 850 },
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '2',
      user_id: '',
      title: 'Behind The Scenes Video',
      description: 'Exclusive BTS content',
      media_urls: ['/videos/bts.mp4'],
      platforms: ['onlyfans', 'fansly'],
      status: 'published',
      scheduled_at: null,
      published_at: new Date().toISOString(),
      performance_metrics: { views: 3890, likes: 256, comments: 67, shares: 8, revenue: 620 },
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '3',
      user_id: '',
      title: 'Special Q&A Session',
      description: 'Fan requested Q&A',
      media_urls: [],
      platforms: ['onlyfans', 'mym'],
      status: 'published',
      scheduled_at: null,
      published_at: new Date().toISOString(),
      performance_metrics: { views: 2150, likes: 189, comments: 156, shares: 3, revenue: 0 },
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '4',
      user_id: '',
      title: 'Exclusive PPV Content',
      description: 'Premium content for supporters',
      media_urls: ['/images/ppv.jpg', '/videos/ppv.mp4'],
      platforms: ['onlyfans'],
      status: 'published',
      scheduled_at: null,
      published_at: new Date().toISOString(),
      performance_metrics: { views: 1890, likes: 145, comments: 34, shares: 2, revenue: 1250 },
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '5',
      user_id: '',
      title: 'Morning Routine Video',
      description: 'Day in my life vlog',
      media_urls: ['/videos/routine.mp4'],
      platforms: ['fansly'],
      status: 'published',
      scheduled_at: null,
      published_at: new Date().toISOString(),
      performance_metrics: { views: 1450, likes: 98, comments: 42, shares: 5, revenue: 180 },
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]
}
