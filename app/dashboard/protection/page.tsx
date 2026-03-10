import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Shield, AlertTriangle, CheckCircle, ExternalLink, FileWarning, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LeakAlert } from '@/lib/types'

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
        <Button className="gap-2 bg-circe hover:bg-circe/90">
          <RefreshCw className="h-4 w-4" />
          Invoke Scan
        </Button>
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
              <p className="text-xl font-bold">156</p>
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
              <p className="text-xl font-bold">12</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Active Alerts
          </CardTitle>
          <CardDescription>Content that requires your attention</CardDescription>
        </CardHeader>
        <CardContent>
          {activeAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Shield className="mb-4 h-12 w-12 text-chart-2" />
              <p className="font-medium">All Clear!</p>
              <p className="text-sm text-muted-foreground">No active leak alerts detected</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start justify-between rounded-lg border border-border bg-secondary/30 p-4"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn('text-xs capitalize', severityColors[alert.severity])}>
                        {alert.severity}
                      </Badge>
                      <Badge variant="outline" className={cn('text-xs capitalize', statusColors[alert.status])}>
                        {alert.status.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {alert.source_platform}
                      </span>
                    </div>
                    <p className="text-sm">{alert.source_url}</p>
                    <p className="text-xs text-muted-foreground">
                      Detected {new Date(alert.detected_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View
                    </Button>
                    <Button size="sm">Send DMCA</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
