'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search,
  Zap,
  Lock,
  Crown,
  ArrowLeft,
  Wand2,
  PenTool,
  Brain,
  Target,
  Lightbulb,
  Palette,
  Camera,
  MessageSquare,
  Gift,
  Flame,
  BarChart3,
  Calendar,
  Shield,
  Scroll,
  Music,
  Video,
  Eye,
  Moon,
  Gem,
  Heart,
  Leaf,
  Compass,
  Sun,
} from 'lucide-react'
import { ALL_TOOLS_META, type AIToolCategory } from '@/lib/ai-tools-data'
import { createClient } from '@/lib/supabase/client'

const ICON_MAP: Record<string, React.ElementType> = {
  'caption-generator': Wand2,
  'fantasy-writer': PenTool,
  'content-ideas': Lightbulb,
  'aesthetic-matcher': Palette,
  'photo-enhancer': Camera,
  'ai-chatter': MessageSquare,
  'mood-detector': Brain,
  'gift-suggester': Gift,
  'whale-whisperer': Crown,
  'price-optimizer': Target,
  'viral-predictor': Flame,
  'churn-predictor': BarChart3,
  'cosmic-calendar': Calendar,
  'leak-scanner': Shield,
  'dmca-automator': Scroll,
  'voice-cloning': Music,
  'video-script-ai': Video,
  'competitor-analysis': Eye,
  'circe-oracle': Moon,
  'circe-transformation': Gem,
  'circe-protection-shield': Shield,
  'venus-attraction': Heart,
  'venus-cupid': Target,
  'venus-garden': Leaf,
  'divine-forecast': Compass,
  'standard-of-attraction': Heart,
}

const CATEGORIES: { id: 'all' | AIToolCategory; name: string }[] = [
  { id: 'all', name: 'All Tools' },
  { id: 'content', name: 'Content' },
  { id: 'engagement', name: 'Engagement' },
  { id: 'analytics', name: 'Analytics' },
  { id: 'protection', name: 'Protection' },
  { id: 'premium', name: 'Premium' },
]

interface AIToolsLibraryProps {
  /** Show back button to AI Studio */
  showBackButton?: boolean
  /** Compact mode when embedded in tab (no extra header) */
  compact?: boolean
}

export function AIToolsLibrary({ showBackButton = false, compact = false }: AIToolsLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<'all' | AIToolCategory>('all')
  const [credits, setCredits] = useState<{ used: number; limit: number } | null>(null)
  const [isPro, setIsPro] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
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
          const planId = (data as { plan_id?: string }).plan_id?.toLowerCase()
          setIsPro(
            !!planId && ['venus-pro', 'circe-elite', 'divine-duo'].includes(planId)
          )
        }
      } catch {
        // ignore
      }
    }
    load()
  }, [])

  const filteredTools = ALL_TOOLS_META.filter((tool) => {
    const matchesSearch =
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = activeCategory === 'all' || tool.category === activeCategory
    return matchesSearch && matchesCategory
  })

  const categoryCounts = CATEGORIES.map((c) => ({
    ...c,
    count: c.id === 'all' ? ALL_TOOLS_META.length : ALL_TOOLS_META.filter((t) => t.category === c.id).length,
  }))

  return (
    <div className="space-y-6">
      {showBackButton && (
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/ai-studio">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">AI Tools Library</h1>
            <p className="text-muted-foreground">
              {ALL_TOOLS_META.length} divine tools at your command
            </p>
          </div>
        </div>
      )}

      {!compact && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search AI tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Zap className="h-3 w-3" />
              {credits
                ? `${credits.limit === 999999 ? '∞' : credits.limit - credits.used} credits left`
                : 'AI Credits'}
            </Badge>
            {!isPro && (
              <Button size="sm" className="gap-1 bg-gradient-to-r from-circe to-venus" asChild>
                <Link href="/dashboard/settings?tab=billing#pricing-plans">
                  <Crown className="h-4 w-4" />
                  Upgrade to Pro
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {credits && !compact && (
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

      <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as 'all' | AIToolCategory)}>
        <TabsList className="flex h-auto flex-wrap gap-2 bg-transparent p-0">
          {categoryCounts.map((cat) => (
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
            {filteredTools.map((tool) => {
              const Icon = ICON_MAP[tool.id] ?? Wand2
              const href =
                tool.isPro && !isPro
                  ? '/dashboard/settings?tab=billing#pricing-plans'
                  : `/dashboard/ai-studio/tools/${tool.id}`
              return (
                <Card
                  key={tool.id}
                  className={`group relative cursor-pointer overflow-hidden transition-all hover:shadow-lg ${
                    tool.isPro ? 'border-gold/30 hover:border-gold/50' : 'border-border hover:border-primary/50'
                  }`}
                  asChild
                >
                  <Link href={href}>
                    {tool.isPro && !isPro && (
                      <div className="absolute right-2 top-2">
                        <Lock className="h-4 w-4 text-gold" />
                      </div>
                    )}
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <div
                          className={`rounded-lg p-2.5 transition-transform group-hover:scale-110 ${
                            tool.isPro ? 'bg-gold/10' : 'bg-primary/10'
                          }`}
                        >
                          <Icon
                            className={`h-5 w-5 ${
                              tool.isPro ? 'text-gold' : 'text-primary'
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold truncate">{tool.name}</h3>
                            {tool.badge && (
                              <Badge
                                variant="secondary"
                                className={`text-xs ${
                                  tool.badge.includes('Circe')
                                    ? 'bg-circe/20 text-circe-light'
                                    : tool.badge.includes('Venus')
                                      ? 'bg-venus/20 text-venus'
                                      : tool.badge === 'Agency'
                                        ? 'bg-gold/20 text-gold'
                                        : ''
                                }`}
                              >
                                {tool.badge}
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                            {tool.description}
                          </p>
                          {tool.credits != null && (
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
                        <span className="block w-full rounded-md bg-gradient-to-r from-circe to-venus px-3 py-2 text-center text-sm font-medium">
                          Unlock with Pro
                        </span>
                      ) : (
                        <span className="block w-full rounded-md bg-secondary px-3 py-2 text-center text-sm font-medium">
                          Use Tool
                        </span>
                      )}
                    </div>
                  </Link>
                </Card>
              )
            })}
          </div>

          {filteredTools.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No tools found</h3>
              <p className="text-muted-foreground">Try a different search term or category</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {!isPro && !compact && (
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
