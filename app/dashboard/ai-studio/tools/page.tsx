'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Search, Star, Lock, Crown, Zap, ArrowLeft,
  // All Tools
  Wand2, PenTool, Brain, Target, Lightbulb, Palette, Flame, Eye,
  Music, Video, Camera, MessageSquare, Heart, Sparkles, Moon, Sun,
  Shield, TrendingUp, Users, BarChart3, Calendar, Gift, Gem,
  Scroll, Compass, Feather, Wind, Droplets, Mountain, Leaf
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface AITool {
  id: string
  name: string
  description: string
  longDescription: string
  icon: React.ElementType
  color: string
  bgColor: string
  category: 'content' | 'engagement' | 'analytics' | 'protection' | 'premium'
  badge?: string
  isPro?: boolean
  credits?: number
}

const allTools: AITool[] = [
  // Content Creation
  {
    id: 'caption-generator',
    name: 'Caption Generator',
    description: 'AI-powered captions for any content',
    longDescription: 'Generate engaging, platform-optimized captions with hashtags, emojis, and calls-to-action tailored to your audience.',
    icon: Wand2,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    category: 'content',
    badge: 'Popular',
    credits: 1,
  },
  {
    id: 'fantasy-writer',
    name: 'Fantasy Writer',
    description: 'Roleplay and story generator',
    longDescription: 'Create immersive roleplay scenarios, fantasy stories, and personalized narratives that captivate your audience.',
    icon: PenTool,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    category: 'content',
    badge: 'Popular',
    credits: 2,
  },
  {
    id: 'content-ideas',
    name: 'Content Ideas',
    description: 'Trending content suggestions',
    longDescription: 'Get AI-powered content ideas based on trending topics, your niche, and what performs best for similar creators.',
    icon: Lightbulb,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    category: 'content',
    credits: 1,
  },
  {
    id: 'aesthetic-matcher',
    name: 'Aesthetic Matcher',
    description: 'Match trending visual styles',
    longDescription: 'Analyze your content aesthetic and get recommendations to align with trending styles while maintaining your unique brand.',
    icon: Palette,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    category: 'content',
    credits: 1,
  },
  {
    id: 'photo-enhancer',
    name: 'Photo Enhancer',
    description: 'AI image optimization',
    longDescription: 'Enhance your photos with AI-powered adjustments for lighting, color, and quality optimization.',
    icon: Camera,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    category: 'content',
    credits: 2,
  },
  // Engagement
  {
    id: 'ai-chatter',
    name: 'AI Chatter',
    description: 'Automated fan responses',
    longDescription: 'Train AI to respond to fans in your voice, handling common questions and keeping conversations going 24/7.',
    icon: MessageSquare,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    category: 'engagement',
    badge: 'Popular',
    credits: 1,
  },
  {
    id: 'mood-detector',
    name: 'Mood Detector',
    description: 'Analyze fan emotional state',
    longDescription: 'Understand your fans better by analyzing message sentiment to tailor your responses and content.',
    icon: Brain,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    category: 'engagement',
    badge: 'New',
    credits: 1,
  },
  {
    id: 'gift-suggester',
    name: 'Gift Suggester',
    description: 'Personalized gift recommendations',
    longDescription: 'Suggest personalized gifts and rewards for your top fans based on their engagement patterns and preferences.',
    icon: Gift,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    category: 'engagement',
    credits: 1,
  },
  {
    id: 'whale-whisperer',
    name: 'Whale Whisperer',
    description: 'High-value fan engagement',
    longDescription: 'Specialized AI assistance for engaging with your highest-spending fans to maximize retention and tips.',
    icon: Crown,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    category: 'engagement',
    credits: 2,
  },
  // Analytics
  {
    id: 'price-optimizer',
    name: 'Price Optimizer',
    description: 'Optimal pricing suggestions',
    longDescription: 'AI analyzes your engagement data to suggest optimal pricing for subscriptions, PPV, and custom content.',
    icon: Target,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    category: 'analytics',
    credits: 2,
  },
  {
    id: 'viral-predictor',
    name: 'Viral Predictor',
    description: 'Content success prediction',
    longDescription: 'Predict which content is most likely to go viral before you post, based on trending patterns and your audience.',
    icon: Flame,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    category: 'analytics',
    badge: 'Beta',
    credits: 2,
  },
  {
    id: 'churn-predictor',
    name: 'Churn Predictor',
    description: 'Identify at-risk subscribers',
    longDescription: 'Predict which fans are likely to unsubscribe and get personalized retention strategies.',
    icon: BarChart3,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    category: 'analytics',
    credits: 2,
  },
  {
    id: 'cosmic-calendar',
    name: 'Cosmic Calendar',
    description: 'Astrology-powered scheduling',
    longDescription: 'Plan your content around celestial events, zodiac cycles, and lunar phases for maximum engagement.',
    icon: Calendar,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
    category: 'analytics',
    credits: 1,
  },
  // Protection (Circe Domain)
  {
    id: 'leak-scanner',
    name: 'Leak Scanner',
    description: 'Content leak detection',
    longDescription: 'Circe continuously scans the web to find unauthorized copies of your content for DMCA takedown.',
    icon: Shield,
    color: 'text-circe',
    bgColor: 'bg-circe/10',
    category: 'protection',
    credits: 3,
  },
  {
    id: 'dmca-automator',
    name: 'DMCA Automator',
    description: 'Automated takedown requests',
    longDescription: 'Automatically generate and submit DMCA takedown requests when leaked content is detected.',
    icon: Scroll,
    color: 'text-circe',
    bgColor: 'bg-circe/10',
    category: 'protection',
    credits: 2,
  },
  // Premium Tools
  {
    id: 'voice-cloning',
    name: 'Voice Cloning',
    description: 'Clone your voice for responses',
    longDescription: 'Create an AI clone of your voice to send personalized audio messages at scale.',
    icon: Music,
    color: 'text-gold',
    bgColor: 'bg-gold/10',
    category: 'premium',
    isPro: true,
    credits: 5,
  },
  {
    id: 'video-script-ai',
    name: 'Video Script AI',
    description: 'Generate video scripts',
    longDescription: 'Create engaging video scripts tailored to your style, including intros, outros, and calls-to-action.',
    icon: Video,
    color: 'text-gold',
    bgColor: 'bg-gold/10',
    category: 'premium',
    isPro: true,
    credits: 3,
  },
  {
    id: 'competitor-analysis',
    name: 'Competitor Analysis',
    description: 'AI-powered competitor insights',
    longDescription: 'Analyze competitor strategies, pricing, and content to stay ahead of the competition.',
    icon: Eye,
    color: 'text-gold',
    bgColor: 'bg-gold/10',
    category: 'premium',
    isPro: true,
    credits: 5,
  },
  {
    id: 'circe-oracle',
    name: "Circe's Oracle",
    description: 'Deep retention prophecies',
    longDescription: 'Like the enchantress who foresaw the future, receive prophetic insights on subscriber behavior and loyalty patterns.',
    icon: Moon,
    color: 'text-circe-light',
    bgColor: 'bg-circe/10',
    category: 'premium',
    isPro: true,
    badge: 'Circe Pro',
    credits: 4,
  },
  {
    id: 'circe-transformation',
    name: "Circe's Transformation",
    description: 'Transform casual fans into whales',
    longDescription: 'Just as Circe transformed men, this AI identifies and nurtures casual fans with potential to become high-value supporters.',
    icon: Gem,
    color: 'text-circe-light',
    bgColor: 'bg-circe/10',
    category: 'premium',
    isPro: true,
    badge: 'Circe Pro',
    credits: 4,
  },
  {
    id: 'circe-protection-shield',
    name: "Circe's Aegis",
    description: 'Ultimate content protection',
    longDescription: 'Like the divine protection Circe offered heroes, this shield provides enterprise-grade content monitoring across all platforms.',
    icon: Shield,
    color: 'text-circe-light',
    bgColor: 'bg-circe/10',
    category: 'premium',
    isPro: true,
    badge: 'Circe Pro',
    credits: 6,
  },
  {
    id: 'venus-attraction',
    name: "Venus's Allure",
    description: 'Magnetic content optimization',
    longDescription: 'Channel the goddess of beauty to optimize your content for maximum attraction and new subscriber conversion.',
    icon: Heart,
    color: 'text-venus',
    bgColor: 'bg-venus/10',
    category: 'premium',
    isPro: true,
    badge: 'Venus Pro',
    credits: 4,
  },
  {
    id: 'venus-cupid',
    name: "Cupid's Arrow",
    description: 'Target perfect new fans',
    longDescription: 'Like Venus\'s son Cupid, this AI identifies and targets potential fans most likely to fall in love with your content.',
    icon: Target,
    color: 'text-venus',
    bgColor: 'bg-venus/10',
    category: 'premium',
    isPro: true,
    badge: 'Venus Pro',
    credits: 5,
  },
  {
    id: 'venus-garden',
    name: "Venus's Garden",
    description: 'Cultivate fan relationships',
    longDescription: 'Nurture your fan community like a divine garden, with AI-powered relationship management and engagement strategies.',
    icon: Leaf,
    color: 'text-venus',
    bgColor: 'bg-venus/10',
    category: 'premium',
    isPro: true,
    badge: 'Venus Pro',
    credits: 4,
  },
  {
    id: 'divine-forecast',
    name: 'Divine Forecast',
    description: 'Revenue and growth predictions',
    longDescription: 'Receive divine prophecies about your revenue trajectory, growth potential, and optimal business decisions.',
    icon: Compass,
    color: 'text-gold',
    bgColor: 'bg-gold/10',
    category: 'premium',
    isPro: true,
    badge: 'Agency',
    credits: 8,
  },
]

export default function AIToolsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [credits, setCredits] = useState<{ used: number; limit: number } | null>(null)
  const [isPro, setIsPro] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const loadCredits = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
          .from('subscriptions')
          .select('ai_credits_used,ai_credits_limit,plan_id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (data) {
          setCredits({
            used: data.ai_credits_used ?? 0,
            limit: data.ai_credits_limit ?? 100,
          })
          const rawPlanId = (data as any).plan_id as string | null | undefined
          const normalizedPlanId = rawPlanId?.toLowerCase() || null

          const isKnownProPlan =
            !!normalizedPlanId &&
            ['venus-pro', 'circe-elite', 'divine-duo'].includes(normalizedPlanId)

          const hasUnlimitedCredits = (data.ai_credits_limit ?? 0) >= 999999

          if (isKnownProPlan || hasUnlimitedCredits) {
            setIsPro(true)
          } else {
            setIsPro(false)
          }
        } else {
          setCredits({ used: 0, limit: 100 })
        }
      } catch {
        // silent; fallback stays null
      }
    }
    loadCredits()
  }, [])

  const filteredTools = allTools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = activeCategory === 'all' || tool.category === activeCategory
    return matchesSearch && matchesCategory
  })

  const categories = [
    { id: 'all', name: 'All Tools', count: allTools.length },
    { id: 'content', name: 'Content', count: allTools.filter(t => t.category === 'content').length },
    { id: 'engagement', name: 'Engagement', count: allTools.filter(t => t.category === 'engagement').length },
    { id: 'analytics', name: 'Analytics', count: allTools.filter(t => t.category === 'analytics').length },
    { id: 'protection', name: 'Protection', count: allTools.filter(t => t.category === 'protection').length },
    { id: 'premium', name: 'Premium', count: allTools.filter(t => t.category === 'premium').length },
  ]

  const getToolHref = (toolId: string): string => {
    switch (toolId) {
      case 'caption-generator':
      case 'fantasy-writer':
      case 'content-ideas':
      case 'aesthetic-matcher':
      case 'photo-enhancer':
      case 'venus-attraction':
      case 'venus-cupid':
      case 'venus-garden':
        return '/dashboard/ai-studio?ai=venus'
      case 'price-optimizer':
      case 'viral-predictor':
      case 'churn-predictor':
      case 'divine-forecast':
        return '/dashboard/analytics'
      case 'cosmic-calendar':
        return '/dashboard/content'
      case 'ai-chatter':
        return '/dashboard/ai-studio?tab=chatter'
      case 'mood-detector':
      case 'gift-suggester':
      case 'whale-whisperer':
      case 'circe-oracle':
      case 'circe-transformation':
      case 'circe-protection-shield':
        return '/dashboard/ai-studio?ai=circe'
      case 'leak-scanner':
      case 'dmca-automator':
        return '/dashboard/protection'
      case 'voice-cloning':
      case 'video-script-ai':
      case 'competitor-analysis':
      default:
        return '/dashboard/ai-studio?tab=tools'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/ai-studio">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">AI Tools Library</h1>
            <p className="text-muted-foreground">
              {allTools.length} divine tools at your command
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Zap className="h-3 w-3" />
            {credits
              ? `${credits.limit === 999999 ? '∞' : credits.limit - credits.used} credits left`
              : 'AI Credits'}
          </Badge>
          {!isPro && (
            <Button
              size="sm"
              className="gap-1 bg-gradient-to-r from-circe to-venus"
              asChild
            >
              <Link href="/dashboard/settings?tab=billing#pricing-plans">
                <Crown className="h-4 w-4" />
                Upgrade to Pro
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search AI tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {credits && (
        <p className="text-xs text-muted-foreground">
          You have{' '}
          <span className="font-semibold">
            {credits.limit === 999999 ? 'unlimited' : credits.limit - credits.used}
          </span>{' '}
          of{' '}
          <span className="font-semibold">
            {credits.limit === 999999 ? '∞' : credits.limit}
          </span>{' '}
          AI credits remaining this period.
        </p>
      )}

      {/* Categories */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="flex h-auto flex-wrap gap-2 bg-transparent p-0">
          {categories.map((cat) => (
            <TabsTrigger
              key={cat.id}
              value={cat.id}
              className="gap-1 border border-border bg-card px-3 py-2 data-[state=active]:border-primary/50 data-[state=active]:bg-primary/10"
            >
              {cat.name}
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {cat.count}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredTools.map((tool) => (
              <Card 
                key={tool.id}
                className={`group relative cursor-pointer overflow-hidden transition-all hover:shadow-lg ${
                  tool.isPro 
                    ? 'border-gold/30 hover:border-gold/50' 
                    : 'border-border hover:border-primary/50'
                }`}
                asChild={isPro && !tool.isPro}
              >
                <Link href={isPro || !tool.isPro ? getToolHref(tool.id) : '/dashboard/settings?tab=billing#pricing-plans'}>
                {tool.isPro && !isPro && (
                  <div className="absolute right-2 top-2">
                    <Lock className="h-4 w-4 text-gold" />
                  </div>
                )}
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-lg p-2.5 ${tool.bgColor} transition-transform group-hover:scale-110`}>
                      <tool.icon className={`h-5 w-5 ${tool.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{tool.name}</h3>
                        {tool.badge && (
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${
                              tool.badge.includes('Circe') ? 'bg-circe/20 text-circe-light' :
                              tool.badge.includes('Venus') ? 'bg-venus/20 text-venus' :
                              tool.badge === 'Agency' ? 'bg-gold/20 text-gold' : ''
                            }`}
                          >
                            {tool.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {tool.description}
                      </p>
                      {tool.credits && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                          <Zap className="h-3 w-3" />
                          {tool.credits} credit{tool.credits > 1 ? 's' : ''}/use
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="absolute bottom-0 left-0 right-0 translate-y-full p-4 transition-transform group-hover:translate-y-0">
                  {tool.isPro && !isPro ? (
                    <Button
                      size="sm"
                      className="w-full bg-gradient-to-r from-circe to-venus hover:opacity-90"
                      variant="default"
                      asChild
                    >
                      <Link href="/dashboard/settings?tab=billing#pricing-plans">
                        Unlock with Pro
                      </Link>
                    </Button>
                  ) : (
                    <Button size="sm" className="w-full" variant="secondary" asChild>
                      <Link href={getToolHref(tool.id)}>
                      Use Tool
                      </Link>
                    </Button>
                  )}
                </div>
                </Link>
              </Card>
            ))}
          </div>

          {filteredTools.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No tools found</h3>
              <p className="text-muted-foreground">
                Try a different search term or category
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Pro Upsell */}
      {!isPro && (
        <Card className="border-gold/30 bg-gradient-to-r from-circe/5 via-gold/5 to-venus/5">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center sm:flex-row sm:text-left">
            <div className="flex -space-x-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-circe/20 ring-2 ring-background">
                <Moon className="h-6 w-6 text-circe-light" />
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-venus/20 ring-2 ring-background">
                <Sun className="h-6 w-6 text-venus" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">Unlock Divine Powers</h3>
              <p className="text-muted-foreground">
                Upgrade to Pro to access exclusive Circe and Venus tools, unlimited credits, and priority support.
              </p>
            </div>
            <Button className="gap-2 bg-gradient-to-r from-circe to-venus" asChild>
              <Link href="/dashboard/settings?tab=billing#pricing-plans">
                <Crown className="h-4 w-4" />
                Upgrade Now
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
