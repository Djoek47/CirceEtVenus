import { createClient } from '@/lib/supabase/server'
import { FansTable } from '@/components/fans/fans-table'
import { FansHeader } from '@/components/fans/fans-header'
import { FansStats } from '@/components/fans/fans-stats'
import type { Fan } from '@/lib/types'

function normalizeFan(row: Record<string, unknown>): Fan {
  const tier = (row.subscription_tier ?? row.tier ?? 'regular') as string
  const username = (row.username ?? row.platform_username ?? '') as string
  return {
    id: row.id as string,
    user_id: row.user_id as string,
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

  const { data: rows } = await supabase
    .from('fans')
    .select('*')
    .eq('user_id', user.id)
    .order('total_spent', { ascending: false })

  const fans: Fan[] = (rows || []).map(normalizeFan)

  const stats = {
    totalFans: fans.length,
    whales: fans.filter(f => f.tier === 'whale' || f.tier === 'vip').length,
    totalRevenue: fans.reduce((sum, f) => sum + f.total_spent, 0),
    activeFans: fans.filter(f => f.tier !== 'inactive').length,
  }

  return (
    <div className="space-y-6">
      <FansHeader />
      <FansStats stats={stats} />
      <FansTable fans={fans} />
    </div>
  )
}
