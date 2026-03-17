import { createClient } from '@/lib/supabase/server'
import { ConnectedPlatforms } from '@/components/dashboard/connected-platforms'
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Moon } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Check for platform connections
  const { data: connections } = await supabase
    .from('platform_connections')
    .select('platform, is_connected, last_sync_at')
    .eq('user_id', user.id)
    .eq('is_connected', true)

  const { data: analytics } = await supabase
    .from('analytics_snapshots')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(30)

  const { data: content } = await supabase
    .from('content')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="sr-only">
          {/* The dashboard component renders the title/filters; keep header for layout consistency */}
          <h2>Analytics</h2>
        </div>
        <div className="flex items-center gap-2">
          <ConnectedPlatforms />
          <Button
            asChild
            size="sm"
            variant="outline"
            className="hidden sm:inline-flex border-circe/40 text-circe-light hover:bg-circe/10"
          >
            <Link href="/dashboard/ai-studio?ai=circe">
              <Moon className="mr-1 h-4 w-4" />
              Circe Retention Lab
            </Link>
          </Button>
        </div>
      </div>

      <AnalyticsDashboard
        analytics={(analytics as any) || []}
        connections={(connections as any) || []}
        content={(content as any) || []}
      />
    </div>
  )
}
