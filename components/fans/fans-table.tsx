'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'

// Manual number formatting to avoid hydration mismatch (no Intl dependency)
function formatCurrency(amount: number): string {
  const str = Math.round(amount).toString()
  const parts: string[] = []
  for (let i = str.length; i > 0; i -= 3) {
    parts.unshift(str.slice(Math.max(0, i - 3), i))
  }
  return parts.join(',')
}

// Consistent date formatting to avoid hydration mismatch
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
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
import { MoreHorizontal, MessageSquare, Star, Ban, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Fan } from '@/lib/types'
import Link from 'next/link'

interface FansTableProps {
  fans: Fan[]
}

const tierColors = {
  whale: 'bg-primary/20 text-primary border-primary/30',
  regular: 'bg-chart-2/20 text-chart-2 border-chart-2/30',
  new: 'bg-chart-4/20 text-chart-4 border-chart-4/30',
  inactive: 'bg-muted text-muted-foreground border-border',
}

const platformColors = {
  onlyfans: 'bg-[#00AFF0]/20 text-[#00AFF0]',
  mym: 'bg-[#FF4D67]/20 text-[#FF4D67]',
  fansly: 'bg-[#009FFF]/20 text-[#009FFF]',
}

export function FansTable({ fans }: FansTableProps) {
  const [selectedFans, setSelectedFans] = useState<string[]>([])

  const toggleFan = (fanId: string) => {
    setSelectedFans(prev =>
      prev.includes(fanId)
        ? prev.filter(id => id !== fanId)
        : [...prev, fanId]
    )
  }

  const toggleAll = () => {
    setSelectedFans(prev =>
      prev.length === fans.length ? [] : fans.map(f => f.id)
    )
  }

  if (fans.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium">No Fans Yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Connect your platforms in Settings to import your fans and start managing your community.
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
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedFans.length === fans.length && fans.length > 0}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Fan</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead className="text-right">Total Spent</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fans.map((fan) => (
              <TableRow key={fan.id} className="border-border">
                <TableCell>
                  <Checkbox
                    checked={selectedFans.includes(fan.id)}
                    onCheckedChange={() => toggleFan(fan.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border border-border">
                      <AvatarImage src={fan.avatar_url || undefined} />
                      <AvatarFallback className="bg-secondary text-secondary-foreground">
                        {fan.display_name?.[0] || fan.platform_username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{fan.display_name || fan.platform_username}</p>
                      <p className="text-xs text-muted-foreground">@{fan.platform_username}</p>
                    </div>
                    {fan.is_favorite && (
                      <Star className="h-4 w-4 fill-chart-4 text-chart-4" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn('text-xs', platformColors[fan.platform])}>
                    {fan.platform.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn('text-xs capitalize', tierColors[fan.tier])}>
                    {fan.tier}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  ${formatCurrency(fan.total_spent)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {fan.last_interaction
                    ? formatDate(fan.last_interaction)
                    : 'Never'}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/fans/${fan.id}`} className="flex items-center">
                          <Eye className="mr-2 h-4 w-4" />
                          View Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Send Message
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Star className="mr-2 h-4 w-4" />
                        {fan.is_favorite ? 'Remove Favorite' : 'Add to Favorites'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Ban className="mr-2 h-4 w-4" />
                        Block Fan
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
