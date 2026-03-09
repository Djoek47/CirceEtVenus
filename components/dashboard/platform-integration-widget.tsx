'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Link2, Check, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface Platform {
  id: string
  name: string
  logo: React.ReactNode
  connected: boolean
  color: string
}

export function PlatformIntegrationWidget() {
  const [platforms] = useState<Platform[]>([
    {
      id: 'onlyfans',
      name: 'OnlyFans',
      logo: (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00AFF0]/10">
          <span className="text-sm font-bold text-[#00AFF0]">OF</span>
        </div>
      ),
      connected: false,
      color: '#00AFF0',
    },
    {
      id: 'fansly',
      name: 'Fansly',
      logo: (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E91E63]/10">
          <span className="text-sm font-bold text-[#E91E63]">F</span>
        </div>
      ),
      connected: false,
      color: '#E91E63',
    },
    {
      id: 'mym',
      name: 'MYM',
      logo: (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
          <span className="text-sm font-bold text-purple-500">M</span>
        </div>
      ),
      connected: false,
      color: '#8B5CF6',
    },
  ])

  const connectedCount = platforms.filter(p => p.connected).length
  const hasConnected = connectedCount > 0

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-5 w-5 text-primary" />
            Connect Platforms
          </CardTitle>
          {hasConnected ? (
            <Badge variant="outline" className="gap-1 text-green-500 border-green-500/30">
              <Check className="h-3 w-3" />
              {connectedCount} Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Not Connected
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs">
          Link your accounts to unlock full platform features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {platforms.map((platform) => (
          <div 
            key={platform.id}
            className="flex items-center justify-between rounded-lg border border-border bg-card/50 p-2.5"
          >
            <div className="flex items-center gap-2.5">
              {platform.logo}
              <span className="text-sm font-medium">{platform.name}</span>
            </div>
            {platform.connected ? (
              <Badge variant="secondary" className="gap-1 text-green-500">
                <Check className="h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Button size="sm" variant="outline" className="h-7 text-xs">
                Connect
              </Button>
            )}
          </div>
        ))}
        
        <Link href="/dashboard/settings?tab=integrations">
          <Button variant="ghost" size="sm" className="w-full gap-1 text-primary">
            Manage Integrations
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
