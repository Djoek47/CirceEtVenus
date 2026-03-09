'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Fan } from '@/lib/types'

// Consistent number formatting to avoid hydration mismatch
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

interface RecentFansProps {
  fans: Fan[]
}

const tierColors = {
  whale: 'bg-primary/20 text-primary border-primary/30',
  regular: 'bg-chart-2/20 text-chart-2 border-chart-2/30',
  new: 'bg-chart-4/20 text-chart-4 border-chart-4/30',
  inactive: 'bg-muted text-muted-foreground border-muted',
}

const platformColors = {
  onlyfans: 'bg-[#00AFF0]/20 text-[#00AFF0]',
  mym: 'bg-[#FF4D67]/20 text-[#FF4D67]',
  fansly: 'bg-[#009FFF]/20 text-[#009FFF]',
}

export function RecentFans({ fans }: RecentFansProps) {
  const displayFans = fans.length > 0 ? fans : generateSampleFans()

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Fans</CardTitle>
          <CardDescription>Latest subscribers across platforms</CardDescription>
        </div>
        <Link href="/dashboard/fans">
          <Button variant="ghost" size="sm" className="gap-1">
            View All <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayFans.map((fan) => (
            <div key={fan.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarImage src={fan.avatar_url || undefined} />
                  <AvatarFallback className="bg-secondary text-secondary-foreground">
                    {fan.display_name?.[0] || fan.platform_username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{fan.display_name || fan.platform_username}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn('text-xs', platformColors[fan.platform])}>
                      {fan.platform.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      ${formatCurrency(fan.total_spent)} spent
                    </span>
                  </div>
                </div>
              </div>
              <Badge variant="outline" className={cn('text-xs capitalize', tierColors[fan.tier])}>
                {fan.tier}
              </Badge>
            </div>
          ))}
        </div>
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
      subscription_start: null,
      last_interaction: null,
      notes: null,
      tags: [],
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
      subscription_start: null,
      last_interaction: null,
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
      subscription_start: null,
      last_interaction: null,
      notes: null,
      tags: [],
      is_favorite: false,
      is_blocked: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]
}
