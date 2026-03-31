import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth'

export type DashboardStats = {
  totalRevenue: number
  totalFans: number
  activeConversations: number
  scheduledContent: number
  leakAlerts: number
  mentionsToReview: number
  hasConnectedPlatforms: boolean
}

export function useDashboardStats() {
  const { session } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.user) {
      setStats(null)
      setLoading(false)
      return
    }
    const uid = session.user.id
    let cancelled = false
    ;(async () => {
      try {
        const [
          { data: fans },
          { data: scheduledRows },
          { data: conversations },
          { data: leakAlerts },
          { data: mentions },
          { data: analytics },
          { data: platformConnections },
        ] = await Promise.all([
          supabase.from('fans').select('id').eq('user_id', uid).limit(5),
          supabase.from('content').select('id').eq('user_id', uid).eq('status', 'scheduled'),
          supabase.from('conversations').select('id').eq('user_id', uid),
          supabase.from('leak_alerts').select('id').eq('user_id', uid).eq('status', 'detected').limit(5),
          supabase
            .from('reputation_mentions')
            .select('id')
            .eq('user_id', uid)
            .eq('is_reviewed', false)
            .limit(5),
          supabase
            .from('analytics_snapshots')
            .select('*')
            .eq('user_id', uid)
            .order('date', { ascending: false })
            .limit(30),
          supabase.from('platform_connections').select('platform').eq('user_id', uid).eq('is_connected', true),
        ])
        if (cancelled) return

        const hasConnectedPlatforms = (platformConnections?.length || 0) > 0
        type Snap = {
          platform: string
          date: string
          revenue?: number
          total_fans?: number
          messages_sent?: number
        }
        const rows = (analytics ?? []) as Snap[]
        const totalRevenue = rows.reduce((sum, a) => sum + (a.revenue || 0), 0)

        const latestByPlatform = new Map<string, Snap>()
        rows.forEach((a) => {
          const existing = latestByPlatform.get(a.platform)
          if (!existing || new Date(a.date) > new Date(existing.date)) {
            latestByPlatform.set(a.platform, a)
          }
        })

        const totalFans =
          Array.from(latestByPlatform.values()).reduce((sum, a) => sum + (a.total_fans || 0), 0) ||
          fans?.length ||
          0

        const activeConversations =
          (hasConnectedPlatforms
            ? Array.from(latestByPlatform.values()).reduce((sum, a) => sum + (a.messages_sent || 0), 0)
            : 0) || conversations?.length || 0

        setStats({
          totalRevenue,
          totalFans,
          activeConversations,
          scheduledContent: scheduledRows?.length || 0,
          leakAlerts: leakAlerts?.length || 0,
          mentionsToReview: mentions?.length || 0,
          hasConnectedPlatforms,
        })
      } catch {
        if (!cancelled) setStats(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [session?.user?.id])

  return { stats, loading }
}
