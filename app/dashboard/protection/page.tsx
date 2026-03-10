import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, AlertTriangle, CheckCircle, FileWarning } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LeakAlert } from '@/lib/types'
import { ProtectionDashboard } from '@/components/protection/protection-dashboard'

export default async function ProtectionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: leakAlerts } = await supabase
    .from('leak_alerts')
    .select('*')
    .eq('user_id', user.id)
    .order('detected_at', { ascending: false })

  const alerts = leakAlerts || []
  const activeAlerts = alerts.filter(a => a.status === 'detected' || a.status === 'reviewing')
  const resolvedAlerts = alerts.filter(a => a.status === 'resolved' || a.status === 'false_positive')

  const [{ count: protectedContentCount }, { count: dmcaCount }] = await Promise.all([
    supabase.from('content').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('dmca_claims').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
  ])

  const severityColors = {
    critical: 'bg-destructive/20 text-destructive border-destructive/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  }

  const statusColors = {
    detected: 'bg-destructive/20 text-destructive',
    reviewing: 'bg-chart-4/20 text-chart-4',
    resolved: 'bg-chart-2/20 text-chart-2',
    false_positive: 'bg-muted text-muted-foreground',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <span className="text-circe">Circe's</span> Protection Shield
          </h2>
          <p className="text-muted-foreground">
            The enchantress guards your content from unauthorized sharing
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-destructive/10 p-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Alerts</p>
              <p className="text-xl font-bold">{activeAlerts.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-chart-2/10 p-3">
              <CheckCircle className="h-5 w-5 text-chart-2" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Resolved</p>
              <p className="text-xl font-bold">{resolvedAlerts.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Protected Content</p>
              <p className="text-xl font-bold">{protectedContentCount || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-chart-4/10 p-3">
              <FileWarning className="h-5 w-5 text-chart-4" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">DMCA Sent</p>
              <p className="text-xl font-bold">{dmcaCount || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <ProtectionDashboard activeAlerts={activeAlerts as LeakAlert[]} />

      {/* Resolved Alerts */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-chart-2" />
            Resolved Alerts
          </CardTitle>
          <CardDescription>Previously handled leak alerts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {resolvedAlerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className="flex items-start justify-between rounded-lg border border-border bg-secondary/30 p-4 opacity-60"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn('text-xs capitalize', severityColors[alert.severity])}>
                      {alert.severity}
                    </Badge>
                    <Badge variant="outline" className={cn('text-xs capitalize', statusColors[alert.status])}>
                      {alert.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm">{alert.source_url}</p>
                  <p className="text-xs text-muted-foreground">
                    Resolved {alert.resolved_at ? new Date(alert.resolved_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
