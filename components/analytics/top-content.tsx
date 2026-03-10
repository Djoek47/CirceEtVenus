'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Image, Video, FileText, Eye, DollarSign } from 'lucide-react'
import type { Content } from '@/lib/types'

interface TopContentProps {
  content: Content[]
}

export function TopContent({ content }: TopContentProps) {
  const topContent = content.slice(0, 5)

  const getIcon = (c: Content) => {
    if (c.media_urls.length === 0) return FileText
    if (c.media_urls.some(url => url.includes('video'))) return Video
    return Image
  }

  if (topContent.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Top Performing Content</CardTitle>
          <CardDescription>Your best content by engagement</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <Image className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">No Content Yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Connect your platforms to see your top performing content.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>Top Performing Content</CardTitle>
        <CardDescription>Your best content by engagement</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topContent.map((c, index) => {
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
