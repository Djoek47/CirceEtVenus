'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Clock, 
  DollarSign, 
  AlertTriangle,
  Sparkles,
  Loader2,
  ChevronRight
} from 'lucide-react'

interface FanPrediction {
  valueScore: number
  ppvPurchaseProbability: number
  churnRisk: string
  lifetimeValueEstimate: number
  suggestedTier: string
  engagementStrategy: {
    priority: string
    approach: string
    contentTypes: string[]
    bestTimeToMessage: string
    upsellRecommendation: string
  }
  insights: string[]
}

interface FanInsightsPanelProps {
  fanData: {
    username: string
    subscriptionAge?: number
    totalSpent?: number
    messageCount?: number
    tipCount?: number
    tipTotal?: number
    ppvCount?: number
    ppvTotal?: number
    lastActive?: string
    avgResponseTime?: string
    renewalRate?: number
    platform?: string
  }
}

export function FanInsightsPanel({ fanData }: FanInsightsPanelProps) {
  const [prediction, setPrediction] = useState<FanPrediction | null>(null)
  const [loading, setLoading] = useState(false)

  const analyzeFan = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ai/fan-prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fanData }),
      })
      const data = await response.json()
      setPrediction(data)
    } catch (error) {
      console.error('Failed to analyze fan:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      whale: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      vip: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      regular: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      casual: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
      'at-risk': 'bg-red-500/20 text-red-400 border-red-500/30',
    }
    return colors[tier] || 'bg-muted text-muted-foreground'
  }

  const getChurnColor = (risk: string) => {
    const colors: Record<string, string> = {
      low: 'text-green-400',
      medium: 'text-amber-400',
      high: 'text-red-400',
    }
    return colors[risk] || 'text-muted-foreground'
  }

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: 'bg-red-500/20 text-red-400',
      medium: 'bg-amber-500/20 text-amber-400',
      low: 'bg-green-500/20 text-green-400',
    }
    return colors[priority] || 'bg-muted text-muted-foreground'
  }

  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Brain className="h-4 w-4 text-primary" />
          AI Fan Analysis
          {prediction && (
            <Badge variant="outline" className={`ml-auto text-[10px] ${getTierColor(prediction.suggestedTier)}`}>
              {prediction.suggestedTier.toUpperCase()}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!prediction ? (
          <Button 
            onClick={analyzeFan} 
            disabled={loading}
            className="w-full"
            size="sm"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Fan...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                Analyze {fanData.username}
              </>
            )}
          </Button>
        ) : (
          <>
            {/* Value Score */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Fan Value Score</span>
                <span className="text-lg font-bold text-primary">{prediction.valueScore}/100</span>
              </div>
              <Progress value={prediction.valueScore} className="h-2" />
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/30 space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span className="text-xs">PPV Probability</span>
                </div>
                <p className="text-lg font-semibold text-green-400">{prediction.ppvPurchaseProbability}%</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <DollarSign className="h-3.5 w-3.5" />
                  <span className="text-xs">Lifetime Value</span>
                </div>
                <p className="text-lg font-semibold">${prediction.lifetimeValueEstimate}</p>
              </div>
            </div>

            {/* Churn Risk */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`h-4 w-4 ${getChurnColor(prediction.churnRisk)}`} />
                <span className="text-sm">Churn Risk</span>
              </div>
              <span className={`text-sm font-medium capitalize ${getChurnColor(prediction.churnRisk)}`}>
                {prediction.churnRisk}
              </span>
            </div>

            {/* Engagement Strategy */}
            <div className="space-y-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Strategy</span>
                </div>
                <Badge className={`text-[10px] ${getPriorityColor(prediction.engagementStrategy.priority)}`}>
                  {prediction.engagementStrategy.priority.toUpperCase()} PRIORITY
                </Badge>
              </div>
              <p className="text-xs text-foreground/80">{prediction.engagementStrategy.approach}</p>
              
              <div className="flex items-center gap-2 text-xs">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Best time:</span>
                <span>{prediction.engagementStrategy.bestTimeToMessage}</span>
              </div>

              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">Upsell Recommendation</p>
                <p className="text-xs text-green-400">{prediction.engagementStrategy.upsellRecommendation}</p>
              </div>
            </div>

            {/* Insights */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Key Insights
              </p>
              <ul className="space-y-1">
                {prediction.insights.slice(0, 3).map((insight, index) => (
                  <li key={index} className="flex items-start gap-2 text-xs text-foreground/80">
                    <ChevronRight className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                    {insight}
                  </li>
                ))}
              </ul>
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={analyzeFan}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : (
                <Brain className="mr-2 h-3 w-3" />
              )}
              Refresh Analysis
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
