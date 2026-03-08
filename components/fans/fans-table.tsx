'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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

  const displayFans = fans.length > 0 ? fans : generateSampleFans()

  const toggleFan = (fanId: string) => {
    setSelectedFans(prev =>
      prev.includes(fanId)
        ? prev.filter(id => id !== fanId)
        : [...prev, fanId]
    )
  }

  const toggleAll = () => {
    setSelectedFans(prev =>
      prev.length === displayFans.length ? [] : displayFans.map(f => f.id)
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
                  checked={selectedFans.length === displayFans.length && displayFans.length > 0}
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
            {displayFans.map((fan) => (
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
                  ${fan.total_spent.toLocaleString()}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {fan.last_interaction
                    ? new Date(fan.last_interaction).toLocaleDateString()
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

function generateSampleFans(): Fan[] {
  return [
    {
      id: '1',
      user_id: '',
      platform: 'onlyfans',
      platform_username: 'superfan123',
      display_name: 'Super Fan',
      avatar_url: null,
      tier: 'whale',
      total_spent: 2500,
      subscription_start: '2024-01-15',
      last_interaction: '2024-03-07',
      notes: 'VIP supporter',
      tags: ['vip', 'high-spender'],
      is_favorite: true,
      is_blocked: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '2',
      user_id: '',
      platform: 'fansly',
      platform_username: 'loyalfan',
      display_name: 'Loyal Supporter',
      avatar_url: null,
      tier: 'regular',
      total_spent: 450,
      subscription_start: '2024-02-01',
      last_interaction: '2024-03-05',
      notes: null,
      tags: [],
      is_favorite: false,
      is_blocked: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '3',
      user_id: '',
      platform: 'mym',
      platform_username: 'newbie99',
      display_name: 'New Subscriber',
      avatar_url: null,
      tier: 'new',
      total_spent: 25,
      subscription_start: '2024-03-01',
      last_interaction: '2024-03-06',
      notes: null,
      tags: ['new'],
      is_favorite: false,
      is_blocked: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '4',
      user_id: '',
      platform: 'onlyfans',
      platform_username: 'bigtimer',
      display_name: 'Big Spender',
      avatar_url: null,
      tier: 'whale',
      total_spent: 5200,
      subscription_start: '2023-06-15',
      last_interaction: '2024-03-07',
      notes: 'Requests custom content frequently',
      tags: ['custom', 'whale'],
      is_favorite: true,
      is_blocked: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '5',
      user_id: '',
      platform: 'fansly',
      platform_username: 'quietfan',
      display_name: null,
      avatar_url: null,
      tier: 'inactive',
      total_spent: 150,
      subscription_start: '2023-12-01',
      last_interaction: '2024-01-15',
      notes: null,
      tags: [],
      is_favorite: false,
      is_blocked: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]
}
