'use client'

import { useState, useEffect, useCallback } from 'react'
import { FansTable } from '@/components/fans/fans-table'
import { FansHeader } from '@/components/fans/fans-header'
import { FansStats } from '@/components/fans/fans-stats'
import type { Fan } from '@/lib/types'

export type FansFilter = 'database' | 'active' | 'expired' | 'latest' | 'top'

interface FansPageClientProps {
  initialFans: Fan[]
  hasOnlyFansConnected: boolean
  hasFanPlatformsConnected: boolean
}

export function FansPageClient({
  initialFans,
  hasOnlyFansConnected,
  hasFanPlatformsConnected,
}: FansPageClientProps) {
  // When OnlyFans is connected, default to live "active" so the page is live by default
  const [filter, setFilter] = useState<FansFilter>(() =>
    hasOnlyFansConnected ? 'active' : 'database'
  )
  const [liveFans, setLiveFans] = useState<Fan[]>([])
  const [loadingLive, setLoadingLive] = useState(false)

  const fetchLive = useCallback(
    async (f: FansFilter) => {
      if (f === 'database' || !hasOnlyFansConnected) return
      setLoadingLive(true)
      try {
        const res = await fetch(`/api/onlyfans/fans?filter=${f}&limit=50`)
        const data = await res.json()
        if (res.ok && Array.isArray(data.fans)) {
          setLiveFans(data.fans)
        } else {
          setLiveFans([])
        }
      } catch {
        setLiveFans([])
      } finally {
        setLoadingLive(false)
      }
    },
    [hasOnlyFansConnected]
  )

  useEffect(() => {
    if (filter !== 'database') {
      fetchLive(filter)
    }
  }, [filter, fetchLive])

  const fans = filter === 'database' ? initialFans : liveFans
  const stats = {
    totalFans: fans.length,
    whales: fans.filter((f) => f.tier === 'whale' || f.tier === 'vip').length,
    totalRevenue: fans.reduce((sum, f) => sum + f.total_spent, 0),
    activeFans: fans.filter((f) => f.tier !== 'inactive').length,
  }

  return (
    <div className="space-y-6">
      <FansHeader
        filter={filter}
        onFilterChange={setFilter}
        hasOnlyFansConnected={hasOnlyFansConnected}
        loadingLive={loadingLive}
      />
      <FansStats stats={stats} />
      <FansTable
        fans={fans}
        hasFanPlatformsConnected={hasFanPlatformsConnected}
        loading={filter !== 'database' && loadingLive}
        liveFilter={filter !== 'database' ? filter : undefined}
      />
    </div>
  )
}
