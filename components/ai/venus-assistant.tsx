'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  Sun, 
  TrendingUp, 
  Users, 
  Heart,
  Star,
  Send,
  Sparkles,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Loader2
} from 'lucide-react'
import { VoiceInputButton } from '@/components/voice-input-button'
import { useChat } from '@ai-sdk/react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { NICHE_LABELS, NicheKey } from '@/lib/niches'

interface GrowthSuggestion {
  id: string
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  effort: 'easy' | 'medium' | 'hard'
  category: string
}

interface ReputationAnalysis {
  overall_score: number
  sentiment: 'positive' | 'neutral' | 'negative'
  summary: string
  mentions: Array<{
    source: string
    content: string
    sentiment: 'positive' | 'neutral' | 'negative'
    date: string
  }>
  score?: {
    overallScore: number
    sentiment: 'positive' | 'neutral' | 'negative'
    positiveCount: number
    neutralCount: number
    negativeCount: number
  }
}

type ReputationMentionWithReply = {
  id: string
  platform: string
  content_preview: string
  sentiment: 'positive' | 'neutral' | 'negative'
  detected_at: string
  ai_suggested_reply?: string | null
}

// Sample data for growth tab
const growthSuggestions: GrowthSuggestion[] = [
  {
    id: '1',
    title: 'Optimize profile bio with trending keywords',
    description: 'Your bio is missing high-converting keywords. Adding "exclusive", "daily posts", and your niche specialty could increase profile visits by 23%.',
    impact: 'high',
    effort: 'easy',
    category: 'Profile'
  },
  {
    id: '2',
    title: 'Cross-promote on Instagram Reels',
    description: 'Your audience demographic overlaps significantly with Instagram users. Short teaser content could drive 15-20% new subscribers.',
    impact: 'high',
    effort: 'medium',
    category: 'Social'
  },
  {
    id: '3',
    title: 'Collaborate with complementary creators',
    description: 'I have identified 3 creators in your niche with similar audience size. A cross-promotion could benefit both parties.',
    impact: 'medium',
    effort: 'medium',
    category: 'Collaboration'
  },
]

export function VenusAssistant() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const [repLoading, setRepLoading] = useState(false)
  const [repError, setRepError] = useState<string | null>(null)
  const [reputation, setReputation] = useState<ReputationAnalysis | null>(null)
  const [mentions, setMentions] = useState<ReputationMentionWithReply[]>([])
  const [niches, setNiches] = useState<string[]>([])
  
  const [input, setInput] = useState('')
  const { messages, sendMessage, status } = useChat({
    api: '/api/ai/venus',
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: "Welcome, beautiful creator. I am Venus, goddess of love and attraction. My divine sight reveals the paths to grow your following and enhance your irresistible allure. What aspects of your empire do you wish to expand?"
      }
    ]
  })
  const isLoading = status === 'streaming' || status === 'submitted'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return
    sendMessage({ text })
    setInput('')
  }
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-500 bg-green-500/10'
      case 'negative':
        return 'text-red-500 bg-red-500/10'
      default:
        return 'text-yellow-500 bg-yellow-500/10'
    }
  }

  const loadDefaultReputation = async () => {
    setRepLoading(true)
    setRepError(null)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setRepLoading(false)
        return
      }

      const { data: profiles } = await supabase
        .from('social_profiles')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)

      const primary = profiles?.[0] as any
      if (!primary) {
        setRepLoading(false)
        return
      }

      const { data: platformRows } = await supabase
        .from('platform_connections')
        .select('platform,niches')
        .eq('user_id', user.id)
        .eq('is_connected', true)

      const tags =
        platformRows
          ?.flatMap((p: any) => p.niches || [])
          .filter((v: any, i: number, arr: any[]) => typeof v === 'string' && arr.indexOf(v) === i) || []
      setNiches(tags)

      const body = {
        platform: primary.platform,
        username: primary.username,
        additionalKeywords: [],
        connectedPlatforms: [],
      }

      const res = await fetch('/api/social/analyze-reputation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to analyze reputation')
      }
      setReputation(data)

      const mentionsRes = await fetch('/api/social/mentions?limit=20')
      const mentionsJson = await mentionsRes.json()
      if (mentionsRes.ok && !mentionsJson.error) {
        setMentions((mentionsJson.mentions || []) as ReputationMentionWithReply[])
      }
    } catch (err) {
      setRepError(err instanceof Error ? err.message : 'Failed to load reputation')
    } finally {
      setRepLoading(false)
    }
  }

  useEffect(() => {
    loadDefaultReputation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-6">
      {/* Header - Gold Theme */}
      <Card className="border-gold/30 bg-gradient-to-r from-gold/10 via-amber-500/5 to-transparent gold-glow">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-gradient-to-br from-gold/30 to-amber-600/20 p-4 gold-glow">
              <Sun className="h-8 w-8 text-gold" />
            </div>
            <div>
              <CardTitle className="text-xl text-gold">Venus - The Goddess</CardTitle>
              <CardDescription className="text-amber-600/80 dark:text-amber-400/80">
                Growth - Attraction & Seduction - Radiant
              </CardDescription>
              <p className="text-xs text-muted-foreground mt-1">Attract admirers to your realm</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chat Interface - Gold Theme */}
        <Card className="lg:col-span-2 border-gold/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-gold" />
              Consult Venus
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Ask Venus about growth, attraction, new subscribers, content that converts, and your reputation. She helps with profile optimization, what to post next, and strategies to expand your audience.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div ref={scrollRef} className="h-[300px] overflow-y-auto space-y-4 rounded-lg bg-gradient-to-b from-gold/5 to-transparent p-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.role === 'user' 
                      ? 'bg-primary/20 text-foreground' 
                      : 'bg-gradient-to-r from-gold/20 to-amber-500/10 text-foreground border border-gold/20'
                  }`}>
                    {msg.role === 'assistant' && (
                      <div className="text-xs font-medium text-gold mb-1">Venus</div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gradient-to-r from-gold/20 to-amber-500/10 rounded-lg px-4 py-2 border border-gold/20">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 text-gold animate-spin" />
                      <span className="text-xs text-gold">Venus is contemplating...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Input 
                  placeholder="Ask Venus or speak..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="border-gold/30 pr-10 focus-visible:ring-gold"
                  disabled={isLoading}
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2">
                  <VoiceInputButton
                    onTranscript={(text) => setInput(prev => (prev ? prev + ' ' + text : text))}
                    size="sm"
                    variant="ghost"
                  />
                </div>
              </div>
              <Button 
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-gradient-to-r from-gold to-amber-600 hover:from-gold/90 hover:to-amber-600/90 text-white"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Quick Stats - Gold Theme */}
        <div className="space-y-4">
          <Card className="border-gold/20 bg-gradient-to-br from-gold/5 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-gold" />
                Growth Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gold">+12%</div>
              <p className="text-xs text-muted-foreground">New subs this week</p>
            </CardContent>
          </Card>
          <Card className="border-gold/20 bg-gradient-to-br from-gold/5 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Heart className="h-4 w-4 text-gold" />
                Attraction Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gold">94</div>
              <Progress value={94} className="mt-2 h-2 [&>div]:bg-gradient-to-r [&>div]:from-gold [&>div]:to-amber-500" />
            </CardContent>
          </Card>
          <Card className="border-gold/20 bg-gradient-to-br from-gold/5 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Star className="h-4 w-4 text-gold" />
                Sentiment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gold">Positive</div>
              <p className="text-xs text-muted-foreground">89% positive mentions</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs for Detailed Views - Gold Theme */}
      <Tabs defaultValue="growth" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="growth" className="gap-2 data-[state=active]:bg-gold/20 data-[state=active]:text-gold">
            <TrendingUp className="h-4 w-4" />
            Growth Tips
          </TabsTrigger>
          <TabsTrigger value="reputation" className="gap-2 data-[state=active]:bg-gold/20 data-[state=active]:text-gold">
            <MessageCircle className="h-4 w-4" />
            Reputation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="growth" className="space-y-4">
          <Card className="border-gold/20">
            <CardHeader>
              <CardTitle className="text-sm text-gold">Venus&apos;s Growth Recommendations</CardTitle>
              <CardDescription>
                Divine strategies to expand your realm of admirers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {growthSuggestions.map((suggestion) => (
                  <div key={suggestion.id} className="rounded-lg border border-gold/20 p-4 space-y-3 bg-gradient-to-r from-gold/5 to-transparent">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{suggestion.title}</span>
                          <Badge variant="outline" className="text-xs border-gold/30 text-gold">{suggestion.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {suggestion.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span className={`${
                          suggestion.impact === 'high' ? 'text-gold' :
                          suggestion.impact === 'medium' ? 'text-amber-500' :
                          'text-muted-foreground'
                        }`}>
                          Impact: {suggestion.impact}
                        </span>
                        <span>Effort: {suggestion.effort}</span>
                      </div>
                      <Button size="sm" variant="outline" className="border-gold/30 text-gold hover:bg-gold/10">
                        Apply
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reputation" className="space-y-4">
          <Card className="border-gold/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2 text-gold">
                    <MessageCircle className="h-4 w-4 text-gold" />
                    Recent Mentions
                  </CardTitle>
                  <CardDescription>
                    Venus tracks your reputation across the digital realm
                  </CardDescription>
                </div>
                {niches.length > 0 && (
                  <div className="flex flex-wrap gap-1 max-w-xs justify-end">
                    {niches.map((niche) => (
                      <Badge key={niche} variant="outline" className="text-[10px]">
                        {NICHE_LABELS[niche as NicheKey] || niche}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {repError && (
                <div className="mb-3 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
                  {repError}
                </div>
              )}
              {repLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Venus is reading your reputation...
                </div>
              )}

              {reputation && (
                <div className="mb-4 rounded-lg border border-gold/30 bg-gold/5 p-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-medium',
                        getSentimentColor(reputation.sentiment)
                      )}
                    >
                      Overall: {reputation.sentiment}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Score: {reputation.overall_score}/100
                    </span>
                  </div>
                  {reputation.score && (
                    <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3 text-green-500" />
                        Positive: {reputation.score.positiveCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <Minus className="h-3 w-3 text-yellow-500" />
                        Neutral: {reputation.score.neutralCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsDown className="h-3 w-3 text-red-500" />
                        Negative: {reputation.score.negativeCount}
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">{reputation.summary}</p>
                </div>
              )}

              <div className="space-y-3">
                {mentions.slice(0, 6).map((mention) => (
                  <div
                    key={mention.id}
                    className="flex items-start justify-between rounded-lg border border-gold/20 p-4 bg-gradient-to-r from-gold/5 to-transparent"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs border-gold/30">
                          {mention.platform}
                        </Badge>
                        <div className="flex items-center gap-1">
                          {mention.sentiment === 'positive' ? (
                            <ThumbsUp className="h-3 w-3 text-gold" />
                          ) : mention.sentiment === 'negative' ? (
                            <ThumbsDown className="h-3 w-3 text-destructive" />
                          ) : (
                            <Minus className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span
                            className={`text-xs ${
                              mention.sentiment === 'positive'
                                ? 'text-gold'
                                : mention.sentiment === 'negative'
                                  ? 'text-destructive'
                                  : 'text-muted-foreground'
                            }`}
                          >
                            {mention.sentiment}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {mention.content_preview}
                      </p>
                      {mention.ai_suggested_reply && (
                        <div className="mt-1 rounded-md border border-gold/40 bg-gold/10 p-2 text-[11px] space-y-1">
                          <div className="flex items-center gap-1 font-medium text-gold">
                            <MessageCircle className="h-3 w-3" />
                            Suggested reply from Venus
                          </div>
                          <p className="text-gold-foreground whitespace-pre-wrap">
                            {mention.ai_suggested_reply}
                          </p>
                        </div>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        Detected {new Date(mention.detected_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" className="text-gold hover:bg-gold/10">
                      Respond
                    </Button>
                  </div>
                ))}
                {mentions.length === 0 && !repLoading && (
                  <p className="text-xs text-muted-foreground">
                    No mentions found yet. Connect platforms and run a scan from your dashboard to
                    let Venus watch over your name.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
