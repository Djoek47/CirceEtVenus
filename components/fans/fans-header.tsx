'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, Search, Filter, Download, RefreshCw } from 'lucide-react'
import Link from 'next/link'

export function FansHeader() {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)

  async function handleRefresh() {
    setRefreshing(true)
    try {
      const [ofRes, flRes] = await Promise.all([
        fetch('/api/onlyfans/sync', { method: 'POST' }),
        fetch('/api/fansly/sync', { method: 'POST' }),
      ])
      if (!ofRes.ok && !flRes.ok) {
        // If both failed, might be no connections; still refresh to show current data
      }
      router.refresh()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between min-w-0">
      <div className="min-w-0">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Fan Management</h2>
        <p className="text-sm text-muted-foreground">
          Track and manage your subscribers across all platforms
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative w-full sm:w-auto min-w-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search fans..."
            className="w-full bg-input pl-9 sm:w-64 min-h-[44px] sm:min-h-0"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="icon"
            className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Sync fans from OnlyFans & Fansly"
          >
            <RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>All Fans</DropdownMenuItem>
              <DropdownMenuItem>Whales Only</DropdownMenuItem>
              <DropdownMenuItem>Regular</DropdownMenuItem>
              <DropdownMenuItem>New</DropdownMenuItem>
              <DropdownMenuItem>Inactive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="icon" className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0">
            <Download className="h-4 w-4" />
          </Button>

          <Link href="/dashboard/fans/new">
            <Button className="gap-2 min-h-[44px] sm:min-h-0">
              <Plus className="h-4 w-4" />
              Add Fan
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
