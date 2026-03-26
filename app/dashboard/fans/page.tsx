import { createClient } from '@/lib/supabase/server'
import { FansPageClient } from '@/components/fans/fans-page-client'
import type { Fan } from '@/lib/types'

function normalizeFan(row: Record<string, unknown>): Fan {
  const tier = (row.subscription_tier ?? row.tier ?? 'regular') as string
  const username = (row.username ?? row.platform_username ?? '') as string
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    platform_fan_id: (row.platform_fan_id ?? null) as string | null,
    platform: (row.platform ?? 'onlyfans') as Fan['platform'],
    platform_username: username,
    display_name: (row.display_name ?? null) as string | null,
    avatar_url: (row.avatar_url ?? null) as string | null,
    tier: (tier === 'vip' ? 'whale' : tier) as Fan['tier'],
    total_spent: Number(row.total_spent) || 0,
    subscription_start: (row.first_subscribed_at ?? row.subscription_start ?? null) as string | null,
    last_interaction: (row.last_interaction_at ?? row.last_interaction ?? null) as string | null,
    notes: (row.notes ?? null) as string | null,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    is_favorite: Boolean(row.is_favorite),
    is_blocked: Boolean(row.is_blocked),
    created_at: (row.created_at ?? new Date().toISOString()) as string,
    updated_at: (row.updated_at ?? row.created_at ?? new Date().toISOString()) as string,
  }
}

export default async function FansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const [{ data: rows }, { data: connections }, { data: analytics }] = await Promise.all([
    supabase.from('fans').select('*').eq('user_id', user.id).order('total_spent', { ascending: false }),
    supabase.from('platform_connections').select('platform').eq('user_id', user.id).in('platform', ['onlyfans', 'fansly']),
    supabase
      .from('analytics_snapshots')
      .select('platform,total_fans,date')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(30),
  ])

  const fans: Fan[] = (rows || []).map(normalizeFan)
  const hasFanPlatformsConnected = (connections?.length ?? 0) > 0
  const hasOnlyFansConnected = connections?.some((c: { platform: string }) => c.platform === 'onlyfans') ?? false

  // Mirror dashboard logic: derive total fans from the latest snapshot per platform
  const latestByPlatform = new Map<string, { platform: string; total_fans?: number | null; date: string }>()
  ;(analytics || []).forEach((a: any) => {
    if (!latestByPlatform.has(a.platform) || new Date(a.date) > new Date(latestByPlatform.get(a.platform)!.date)) {
      latestByPlatform.set(a.platform, a)
    }
  })
  const analyticsTotalFans =
    Array.from(latestByPlatform.values()).reduce((sum, a) => sum + (a.total_fans || 0), 0) || 0

  return (
    <FansPageClient
      initialFans={fans}
      hasOnlyFansConnected={hasOnlyFansConnected}
      hasFanPlatformsConnected={hasFanPlatformsConnected}
      analyticsTotalFans={analyticsTotalFans}
    />
  )
}
