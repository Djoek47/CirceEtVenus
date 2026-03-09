'use client'

import { useState } from 'react'
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
  Mic
} from 'lucide-react'
import { VoiceInputButton } from '@/components/voice-input-button'

interface GrowthSuggestion {
  id: string
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  effort: 'easy' | 'medium' | 'hard'
  category: string
}

interface Mention {
  id: string
  platform: string
  content: string
  sentiment: 'positive' | 'neutral' | 'negative'
  reach: number
  timestamp: string
}

// Sample data
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

const recentMentions: Mention[] = [
  {
    id: '1',
    platform: 'Twitter',
    content: '"Just subscribed and the content quality is amazing! Best decision I made this month 🔥"',
    sentiment: 'positive',
    reach: 1247,
    timestamp: '2 hours ago'
  },
  {
    id: '2',
    platform: 'Reddit',
    content: 'Has anyone tried their PPV? Is it worth the price?',
    sentiment: 'neutral',
    reach: 892,
    timestamp: '5 hours ago'
  },
  {
    id: '3',
    platform: 'Twitter',
    content: '"Response time could be better but content makes up for it"',
    sentiment: 'neutral',
    reach: 456,
    timestamp: '1 day ago'
  },
]

export function VenusAssistant() {
  const [message, setMessage] = useState('')
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'venus', content: string}>>([
    {
      role: 'venus',
      content: "Welcome, beautiful creator. I am Venus, goddess of love and attraction. My divine sight reveals the paths to grow your following and enhance your irresistible allure. What aspects of your empire do you wish to expand?"
    }
  ])
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async () => {
    if (!message.trim()) return
    
    const userMessage = message
    setMessage('')
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "The stars whisper of untapped potential in your visual presentation. Consider warmer lighting in your next content - it resonates deeply with Venus in Taurus energy and increases perceived intimacy by 34%.",
        "I sense your reputation glows brightly across the digital sphere. Three new positive mentions appeared today, and your sentiment score rises like the morning sun. Shall I craft a gratitude post to amplify this energy?",
        "The cosmic algorithm favors you this week. I recommend posting your most captivating content on Thursday at 8 PM - Venus conjunct Jupiter creates optimal attraction energy.",
        "Your profile radiates beauty, yet certain elements could shine brighter. Small refinements to your bio and preview images could increase conversion by 28%. Would you like my divine recommendations?",
      ]
      setChatMessages(prev => [...prev, { 
        role: 'venus', 
        content: responses[Math.floor(Math.random() * responses.length)]
      }])
      setIsLoading(false)
    }, 1500)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-transparent">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-amber-500/20 p-4 venus-glow">
              <Sun className="h-8 w-8 text-amber-500 dark:text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-xl text-amber-500 dark:text-amber-400">Venus - The Goddess</CardTitle>
              <CardDescription>
                Growth, Attraction & Reputation
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chat Interface */}
        <Card className="lg:col-span-2 border-amber-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500 dark:text-amber-400" />
              Consult Venus
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-[300px] overflow-y-auto space-y-4 rounded-lg bg-muted/30 p-4">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.role === 'user' 
                      ? 'bg-primary/20 text-foreground' 
                      : 'bg-amber-500/20 text-foreground'
                  }`}>
                    {msg.role === 'venus' && (
                      <div className="text-xs font-medium text-amber-500/70 dark:text-amber-400/70 mb-1">Venus</div>
                    )}
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-amber-500/20 rounded-lg px-4 py-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input 
                  placeholder="Ask Venus or speak..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="border-amber-500/30 pr-10 focus-visible:ring-amber-500"
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2">
                  <VoiceInputButton
                    onTranscript={(text) => setMessage(prev => prev + (prev ? ' ' : '') + text)}
                    size="sm"
                    variant="ghost"
                  />
                </div>
              </div>
              <Button 
                onClick={handleSendMessage}
                className="bg-amber-500 hover:bg-amber-500/80 text-white"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="space-y-4">
          <Card className="border-amber-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                Growth Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-500 dark:text-amber-400">+12%</div>
              <p className="text-xs text-muted-foreground">New subs this week</p>
            </CardContent>
          </Card>
          <Card className="border-amber-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Heart className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                Attraction Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-500 dark:text-amber-400">94</div>
              <Progress value={94} className="mt-2 h-2" />
            </CardContent>
          </Card>
          <Card className="border-amber-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                Sentiment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-500 dark:text-amber-400">Positive</div>
              <p className="text-xs text-muted-foreground">89% positive mentions</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs for Detailed Views */}
      <Tabs defaultValue="growth" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="growth" className="gap-2 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400">
            <TrendingUp className="h-4 w-4" />
            Growth Tips
          </TabsTrigger>
          <TabsTrigger value="reputation" className="gap-2 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400">
            <MessageCircle className="h-4 w-4" />
            Reputation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="growth" className="space-y-4">
          <Card className="border-amber-500/20">
            <CardHeader>
              <CardTitle className="text-sm">Venus&apos;s Growth Recommendations</CardTitle>
              <CardDescription>
                Divine strategies to expand your realm of admirers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {growthSuggestions.map((suggestion) => (
                  <div key={suggestion.id} className="rounded-lg border border-amber-500/20 p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{suggestion.title}</span>
                          <Badge variant="outline" className="text-xs">{suggestion.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {suggestion.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span className={`${
                          suggestion.impact === 'high' ? 'text-amber-500 dark:text-amber-400' :
                          suggestion.impact === 'medium' ? 'text-primary' :
                          'text-muted-foreground'
                        }`}>
                          Impact: {suggestion.impact}
                        </span>
                        <span>Effort: {suggestion.effort}</span>
                      </div>
                      <Button size="sm" variant="outline" className="border-amber-500/30 text-amber-500 dark:text-amber-400 hover:bg-amber-500/10">
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
          <Card className="border-amber-500/20">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                Recent Mentions
              </CardTitle>
              <CardDescription>
                Venus tracks your reputation across the digital realm
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentMentions.map((mention) => (
                  <div key={mention.id} className="flex items-start justify-between rounded-lg border border-amber-500/20 p-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{mention.platform}</Badge>
                        <div className="flex items-center gap-1">
                          {mention.sentiment === 'positive' ? (
                            <ThumbsUp className="h-3 w-3 text-amber-500 dark:text-amber-400" />
                          ) : mention.sentiment === 'negative' ? (
                            <ThumbsDown className="h-3 w-3 text-destructive" />
                          ) : (
                            <Minus className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span className={`text-xs ${
                            mention.sentiment === 'positive' ? 'text-amber-500 dark:text-amber-400' :
                            mention.sentiment === 'negative' ? 'text-destructive' :
                            'text-muted-foreground'
                          }`}>
                            {mention.sentiment}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {mention.content}
                      </p>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Reach: {mention.reach.toLocaleString()}</span>
                        <span>{mention.timestamp}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="text-amber-500 dark:text-amber-400 hover:bg-amber-500/10">
                      Respond
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
