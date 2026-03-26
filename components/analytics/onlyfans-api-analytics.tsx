'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, BarChart3 } from 'lucide-react'

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

type BlockState = { loading: boolean; error?: string; data?: unknown }

export function OnlyFansApiAnalytics() {
  const rangeEnd = new Date()
  const rangeStart = new Date()
  rangeStart.setDate(rangeStart.getDate() - 30)
  const start = isoDate(rangeStart)
  const end = isoDate(rangeEnd)
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const [earnings, setEarnings] = useState<BlockState>({ loading: false })
  const [historical, setHistorical] = useState<BlockState>({ loading: false })
  const [comparison, setComparison] = useState<BlockState>({ loading: false })
  const [txSum, setTxSum] = useState<BlockState>({ loading: false })
  const [txByType, setTxByType] = useState<BlockState>({ loading: false })
  const [forecast, setForecast] = useState<BlockState>({ loading: false })
  const [profit, setProfit] = useState<BlockState>({ loading: false })
  const [profitHist, setProfitHist] = useState<BlockState>({ loading: false })

  const run = useCallback(async () => {
    const post = async (url: string, body: object) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error((data as { error?: string })?.error || res.statusText)
      return data
    }

    setEarnings({ loading: true })
    setHistorical({ loading: true })
    setComparison({ loading: true })
    setTxSum({ loading: true })
    setTxByType({ loading: true })
    setForecast({ loading: true })
    setProfit({ loading: true })
    setProfitHist({ loading: true })

    try {
      const [e, h, c, t1, t2, f, p] = await Promise.all([
        post('/api/onlyfans/analytics/earnings', { start_date: start, end_date: end }),
        post('/api/onlyfans/analytics/historical', { time_range: '3m' }),
        post('/api/onlyfans/analytics/comparison', { start_date: start, end_date: end }),
        post('/api/onlyfans/analytics/financial/transactions-summary', { start_date: start, end_date: end }),
        post('/api/onlyfans/analytics/financial/transactions-by-type', { start_date: start, end_date: end }),
        post('/api/onlyfans/analytics/financial/forecast', { horizon_months: 3 }),
        post('/api/onlyfans/analytics/financial/profitability', { year, month }),
      ])
      setEarnings({ loading: false, data: e })
      setHistorical({ loading: false, data: h })
      setComparison({ loading: false, data: c })
      setTxSum({ loading: false, data: t1 })
      setTxByType({ loading: false, data: t2 })
      setForecast({ loading: false, data: f })
      setProfit({ loading: false, data: p })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Request failed'
      setEarnings((s) => ({ ...s, loading: false, error: msg }))
      setHistorical((s) => ({ ...s, loading: false, error: msg }))
      setComparison((s) => ({ ...s, loading: false, error: msg }))
      setTxSum((s) => ({ ...s, loading: false, error: msg }))
      setTxByType((s) => ({ ...s, loading: false, error: msg }))
      setForecast((s) => ({ ...s, loading: false, error: msg }))
      setProfit((s) => ({ ...s, loading: false, error: msg }))
    }

    try {
      const res = await fetch(`/api/onlyfans/analytics/financial/profitability-history?months=12`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || res.statusText)
      setProfitHist({ loading: false, data })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Request failed'
      setProfitHist({ loading: false, error: msg })
    }
  }, [start, end, year, month])

  useEffect(() => {
    void run()
  }, [run])

  const Block = ({
    title,
    state,
  }: {
    title: string
    state: BlockState
  }) => (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-sm font-normal min-h-[4rem]">
          {state.loading ? (
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </span>
          ) : state.error ? (
            <span className="text-destructive text-xs">{state.error}</span>
          ) : (
            <pre className="max-h-40 overflow-auto text-xs whitespace-pre-wrap break-all">
              {state.data == null ? '—' : JSON.stringify(state.data, null, 2)}
            </pre>
          )}
        </CardTitle>
      </CardHeader>
    </Card>
  )

  return (
    <div className="space-y-4 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            OnlyFans API analytics
          </h3>
          <p className="text-sm text-muted-foreground">
            Live metrics from OnlyFansAPI (last 30 days where applicable). Connect OnlyFans under Integrations.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void run()}>
          Reload
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Block title="Earnings overview" state={earnings} />
        <Block title="Historical performance" state={historical} />
        <Block title="Period comparison" state={comparison} />
        <Block title="Transaction summary" state={txSum} />
        <Block title="Transactions by type" state={txByType} />
        <Block title="Revenue forecast" state={forecast} />
        <Block title="Profitability (this month)" state={profit} />
        <Block title="Profitability history" state={profitHist} />
      </div>
    </div>
  )
}
