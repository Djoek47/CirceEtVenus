'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Clock, 
  Target,
  Zap,
  Loader2,
  ArrowUpRight,
  ChevronRight
} from 'lucide-react'

interface RevenueOptimization {
  ppvPricing: {
    recommendedPrice: number
    priceRange: { min: number; max: number }
    reasoning: string
    estimatedConversionRate: number
    projectedRevenue: number
  }
  postingStrategy: {
    bestDays: string[]
    bestTimes: string[]
    postingFrequency: string
    reasoning: string
  }
  audienceTargeting: {
    topFansToTarget: string[]
    massMessageTiming: string
    personalMessageTargets: string
  }
  revenueProjection: {
    currentMonthlyEstimate: number
    optimizedMonthlyEstimate: number
    percentageIncrease: number
    keyActions: string[]
  }
  contentRecommendations: Array<{
    type: string
    expectedEngagement: string
    reasoning: string
  }>
}

interface RevenueOptimizerProps {
  creatorStats?: {
    monthlyRevenue?: number
    subscriberCount?: number
    avgPpvPrice?: number
    ppvConversionRate?: number
    engagementRate?: number
    platform?: string
  }
}

export function RevenueOptimizer({ creatorStats }: RevenueOptimizerProps) {
  const [optimization, setOptimization] = useState<RevenueOptimization | null>(null)
  const [loading, setLoading] = useState(false)

  const runOptimization = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ai/revenue-optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorStats }),
      })
      const data = await response.json()
      setOptimization(data)
    } catch (error) {
      console.error('Failed to run optimization:', error)
    } finally {
      setLoading(false)
    }
  }

  const getEngagementColor = (level: string) => {
    const colors: Record<string, string> = {
      high: 'bg-green-500/20 text-green-400 border-green-500/30',
      medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      low: 'bg-red-500/20 text-red-400 border-red-500/30',
    }
    return colors[level] || 'bg-muted text-muted-foreground'
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          AI Revenue Optimizer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!optimization ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Optimize Your Revenue</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Our AI will analyze your performance data and provide personalized recommendations to maximize your earnings.
            </p>
            <Button onClick={runOptimization} disabled={loading} size="lg">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Your Data...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Run AI Optimization
                </>
              )}
            </Button>
          </div>
        ) : (
          <>
            {/* Revenue Projection Hero */}
            <div className="p-6 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Projected Revenue Increase</h3>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +{optimization.revenueProjection.percentageIncrease}%
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Current Monthly</p>
                  <p className="text-2xl font-bold">${optimization.revenueProjection.currentMonthlyEstimate.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Optimized Monthly</p>
                  <p className="text-2xl font-bold text-green-400">${optimization.revenueProjection.optimizedMonthlyEstimate.toLocaleString()}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-primary/20">
                <p className="text-xs text-muted-foreground mb-2">Key Actions</p>
                <ul className="space-y-1">
                  {optimization.revenueProjection.keyActions.slice(0, 3).map((action, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* PPV Pricing */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-400" />
                    Optimal PPV Pricing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-green-400">${optimization.ppvPricing.recommendedPrice}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Range: ${optimization.ppvPricing.priceRange.min} - ${optimization.ppvPricing.priceRange.max}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Est. Conversion Rate</span>
                      <span>{optimization.ppvPricing.estimatedConversionRate}%</span>
                    </div>
                    <Progress value={optimization.ppvPricing.estimatedConversionRate} className="h-1.5" />
                  </div>
                  <p className="text-xs text-muted-foreground">{optimization.ppvPricing.reasoning}</p>
                </CardContent>
              </Card>

              {/* Posting Strategy */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-400" />
                    Posting Strategy
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Best Days</p>
                      <div className="flex flex-wrap gap-1.5">
                        {optimization.postingStrategy.bestDays.map((day, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {day}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Best Times</p>
                      <div className="flex flex-wrap gap-1.5">
                        {optimization.postingStrategy.bestTimes.map((time, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {time}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Recommended Frequency</p>
                      <p className="text-sm font-medium">{optimization.postingStrategy.postingFrequency}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Content Recommendations */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Content Recommendations
              </h3>
              <div className="grid gap-3 md:grid-cols-3">
                {optimization.contentRecommendations.map((rec, index) => (
                  <div 
                    key={index}
                    className="p-4 rounded-lg border border-border bg-muted/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{rec.type}</span>
                      <Badge variant="outline" className={`text-[10px] ${getEngagementColor(rec.expectedEngagement)}`}>
                        {rec.expectedEngagement.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{rec.reasoning}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Audience Targeting */}
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-400">
                  <Target className="h-4 w-4" />
                  Audience Targeting
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Priority Fan Types</p>
                  <div className="flex flex-wrap gap-1.5">
                    {optimization.audienceTargeting.topFansToTarget.map((fanType, index) => (
                      <Badge key={index} className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                        {fanType}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2 pt-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Mass Message Timing</p>
                    <p className="text-sm">{optimization.audienceTargeting.massMessageTiming}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Personal DM Targets</p>
                    <p className="text-sm">{optimization.audienceTargeting.personalMessageTargets}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button 
              variant="outline" 
              onClick={runOptimization}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <TrendingUp className="mr-2 h-4 w-4" />
              )}
              Refresh Analysis
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
