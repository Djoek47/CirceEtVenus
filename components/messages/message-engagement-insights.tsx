'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, BarChart3, MessageSquare, Users } from 'lucide-react'

interface ChartPoint {
  date?: string
  label?: string
  value?: number
  amount?: number
  count?: number
  [key: string]: unknown
}

interface EngagementData {
  type: 'direct' | 'mass'
  messages: unknown[]
  chart: ChartPoint[]
  topMessage: Record<string, unknown> | null
  buyers: unknown[]
}

export function MessageEngagementInsights() {
  const [type, setType] = useState<'direct' | 'mass'>('direct')
  const [data, setData] = useState<EngagementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/onlyfans/engagement?type=${type}&limit=10`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          setError(json.error)
          setData(null)
        } else {
          setData({
            type: json.type ?? type,
            messages: json.messages ?? [],
            chart: json.chart ?? [],
            topMessage: json.topMessage ?? null,
            buyers: json.buyers ?? [],
          })
        }
      })
      .catch(() => {
        setError('Failed to load engagement data')
        setData(null)
      })
      .finally(() => setLoading(false))
  }, [type])

  if (loading && !data) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">Loading message insights…</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="mt-1 text-xs text-muted-foreground">Connect OnlyFans to see message engagement.</p>
        </CardContent>
      </Card>
    )
  }

  const chartPoints = data?.chart ?? []
  const valueKey = chartPoints[0] != null && 'amount' in chartPoints[0] ? 'amount' : 'value' in chartPoints[0] ? 'value' : 'count'
  const labelKey = chartPoints[0] != null && 'date' in chartPoints[0] ? 'date' : 'label'
  const values = chartPoints.map((p) => Number((p as Record<string, unknown>)[valueKey]) || 0)
  const maxVal = Math.max(1, ...values)

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button
          variant={type === 'direct' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setType('direct')}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Direct messages
        </Button>
        <Button
          variant={type === 'mass' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setType('mass')}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Mass messages
        </Button>
      </div>

      {chartPoints.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {type === 'direct' ? 'Direct' : 'Mass'} message performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              {chartPoints.slice(-14).map((point, i) => {
                const val = Number((point as Record<string, unknown>)[valueKey]) || 0
                const label = String((point as Record<string, unknown>)[labelKey] ?? '')
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div
                      className="w-8 bg-primary/60 rounded-t min-h-[4px]"
                      style={{ height: `${Math.max(4, (val / maxVal) * 80)}px` }}
                      title={`${label}: ${val}`}
                    />
                    <span className="text-[10px] text-muted-foreground truncate max-w-12">
                      {label ? (label.length > 6 ? label.slice(0, 6) + '…' : label) : ''}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {data?.topMessage && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Top message (by purchases)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground line-clamp-2">
              {typeof data.topMessage.text === 'string'
                ? data.topMessage.text
                : typeof data.topMessage.content === 'string'
                  ? data.topMessage.content
                  : '—'}
            </p>
            {data.buyers.length > 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                {data.buyers.length} buyer{data.buyers.length !== 1 ? 's' : ''}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {data && !data.topMessage && chartPoints.length === 0 && (
        <p className="text-sm text-muted-foreground">No engagement data for this period.</p>
      )}
    </div>
  )
}
