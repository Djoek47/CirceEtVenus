'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MoreHorizontal, Edit, Copy, Trash2, Image, Video, FileText, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Content } from '@/lib/types'

interface ContentListProps {
  content: Content[]
}

const statusColors = {
  draft: 'bg-muted text-muted-foreground border-border',
  scheduled: 'bg-chart-4/20 text-chart-4 border-chart-4/30',
  published: 'bg-chart-2/20 text-chart-2 border-chart-2/30',
  archived: 'bg-secondary text-secondary-foreground border-border',
}

const platformColors = {
  onlyfans: 'bg-[#00AFF0]/20 text-[#00AFF0]',
  mym: 'bg-[#FF4D67]/20 text-[#FF4D67]',
  fansly: 'bg-[#009FFF]/20 text-[#009FFF]',
}

export function ContentList({ content }: ContentListProps) {
  const getContentIcon = (c: Content) => {
    if (c.media_urls.length === 0) return FileText
    if (c.media_urls.some(url => url.includes('video'))) return Video
    return Image
  }

  if (content.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <Image className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">No Content Yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Connect your platforms and sync to import your content, or create new content to get started.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead>Content</TableHead>
              <TableHead>Platforms</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead className="text-right">Performance</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {content.map((c) => {
              const ContentIcon = getContentIcon(c)
              return (
                <TableRow key={c.id} className="border-border">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                        <ContentIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{c.title}</p>
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {c.description || 'No description'}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {c.platforms.map((platform) => (
                        <Badge
                          key={platform}
                          variant="outline"
                          className={cn('text-xs', platformColors[platform])}
                        >
                          {platform.toUpperCase()}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn('text-xs capitalize', statusColors[c.status])}
                    >
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.scheduled_at
                      ? new Date(c.scheduled_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Not scheduled'}
                  </TableCell>
                  <TableCell className="text-right">
                    {c.status === 'published' ? (
                      <div className="text-sm">
                        <span className="text-muted-foreground">
                          {c.performance_metrics.views.toLocaleString()} views
                        </span>
                        {c.performance_metrics.revenue > 0 && (
                          <span className="ml-2 text-chart-2">
                            ${c.performance_metrics.revenue}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
