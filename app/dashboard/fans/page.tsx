import { createClient } from '@/lib/supabase/server'
import { FansTable } from '@/components/fans/fans-table'
import { FansHeader } from '@/components/fans/fans-header'
import { FansStats } from '@/components/fans/fans-stats'

export default async function FansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: fans } = await supabase
    .from('fans')
    .select('*')
    .eq('user_id', user.id)
    .order('total_spent', { ascending: false })

  // Calculate stats
  const stats = {
    totalFans: fans?.length || 0,
    whales: fans?.filter(f => f.tier === 'whale').length || 0,
    totalRevenue: fans?.reduce((sum, f) => sum + (f.total_spent || 0), 0) || 0,
    activeFans: fans?.filter(f => f.tier !== 'inactive').length || 0,
  }

  return (
    <div className="space-y-6">
      <FansHeader />
      <FansStats stats={stats} />
      <FansTable fans={fans || []} />
    </div>
  )
}
