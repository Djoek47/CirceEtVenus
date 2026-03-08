'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Zap, DollarSign, MessageSquare, Loader2, Copy, Check } from 'lucide-react'

interface Suggestion {
  text: string
  tone: string
  hasUpsell: boolean
  upsellType: string | null
}

interface AISuggestions {
  suggestions: Suggestion[]
  fanSentiment: string
  upsellOpportunity: number
  recommendedAction: string
}

interface ChatAssistantProps {
  fanMessage: string
  conversationHistory?: string
  fanTier?: string
  creatorPersona?: string
  onSelectSuggestion?: (text: string) => void
}

export function ChatAssistant({ 
  fanMessage, 
  conversationHistory, 
  fanTier = 'regular',
  creatorPersona,
  onSelectSuggestion 
}: ChatAssistantProps) {
  const [suggestions, setSuggestions] = useState<AISuggestions | null>(null)
  const [loading, setLoading] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const generateSuggestions = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ai/chat-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fanMessage,
          conversationHistory,
          fanTier,
          creatorPersona,
        }),
      })
      const data = await response.json()
      setSuggestions(data)
    } catch (error) {
      console.error('Failed to generate suggestions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
    if (onSelectSuggestion) {
      onSelectSuggestion(text)
    }
  }

  const getToneColor = (tone: string) => {
    const colors: Record<string, string> = {
      flirty: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      casual: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      professional: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
      playful: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      seductive: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    }
    return colors[tone] || 'bg-muted text-muted-foreground'
  }

  const getSentimentColor = (sentiment: string) => {
    const colors: Record<string, string> = {
      excited: 'text-green-400',
      interested: 'text-cyan-400',
      neutral: 'text-slate-400',
      cold: 'text-blue-400',
      frustrated: 'text-red-400',
    }
    return colors[sentiment] || 'text-muted-foreground'
  }

  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Chat Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!suggestions ? (
          <Button 
            onClick={generateSuggestions} 
            disabled={loading || !fanMessage}
            className="w-full"
            size="sm"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Reply Suggestions
              </>
            )}
          </Button>
        ) : (
          <>
            {/* Insights Bar */}
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Sentiment:</span>
                <span className={`text-xs font-medium capitalize ${getSentimentColor(suggestions.fanSentiment)}`}>
                  {suggestions.fanSentiment}
                </span>
              </div>
              <div className="h-3 w-px bg-border" />
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Upsell Score:</span>
                <span className={`text-xs font-medium ${suggestions.upsellOpportunity > 70 ? 'text-green-400' : suggestions.upsellOpportunity > 40 ? 'text-amber-400' : 'text-slate-400'}`}>
                  {suggestions.upsellOpportunity}%
                </span>
              </div>
            </div>

            {/* Recommendation */}
            <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
              <div className="flex items-start gap-2">
                <Zap className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-foreground/80">{suggestions.recommendedAction}</p>
              </div>
            </div>

            {/* Suggestions */}
            <div className="space-y-2">
              {suggestions.suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] ${getToneColor(suggestion.tone)}`}>
                        {suggestion.tone}
                      </Badge>
                      {suggestion.hasUpsell && suggestion.upsellType && suggestion.upsellType !== 'none' && (
                        <Badge variant="outline" className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30">
                          <DollarSign className="h-2.5 w-2.5 mr-0.5" />
                          {suggestion.upsellType.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleCopy(suggestion.text, index)}
                    >
                      {copiedIndex === index ? (
                        <Check className="h-3 w-3 text-green-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed">{suggestion.text}</p>
                </div>
              ))}
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={generateSuggestions}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-3 w-3" />
              )}
              Regenerate
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
