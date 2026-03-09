'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Moon, Sun, Star, Shield, TrendingUp, Users, BarChart3, Calendar,
  Wand2, MessageSquare, Camera, Sparkles, Brain, Zap, Heart, Target,
  Palette, Music, Video, PenTool, Lightbulb, Flame, Eye, Lock, Crown
} from 'lucide-react'
import { CirceAssistant } from '@/components/ai/circe-assistant'
import { VenusAssistant } from '@/components/ai/venus-assistant'
import { CosmicCalendar } from '@/components/content/cosmic-calendar'
import { AIToolsSelector } from '@/components/ai/ai-tools-selector'
import { AIChatterWorkspace } from '@/components/ai/ai-chatter-workspace'

export default function AIStudioPage() {
  const [activeTab, setActiveTab] = useState('overview')

  const aiTools = [
    {
      id: 'fantasy-writer',
      name: 'Fantasy Writer',
      description: 'AI-powered roleplay and fantasy story generator',
      icon: PenTool,
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10',
      badge: 'Popular',
    },
    {
      id: 'mood-detector',
      name: 'Mood Detector',
      description: 'Analyze fan messages to detect emotional state',
      icon: Brain,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      badge: 'New',
    },
    {
      id: 'price-optimizer',
      name: 'Price Optimizer',
      description: 'AI suggests optimal pricing based on engagement',
      icon: Target,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      id: 'content-ideas',
      name: 'Content Ideas',
      description: 'Generate trending content ideas for your niche',
      icon: Lightbulb,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      id: 'aesthetic-matcher',
      name: 'Aesthetic Matcher',
      description: 'Match your content aesthetic with trending styles',
      icon: Palette,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
    },
    {
      id: 'viral-predictor',
      name: 'Viral Predictor',
      description: 'Predict content viral potential before posting',
      icon: Flame,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      badge: 'Beta',
    },
  ]

  const premiumFeatures = [
    {
      name: 'Voice Cloning',
      description: 'Clone your voice for automated responses',
      icon: Music,
      locked: true,
    },
    {
      name: 'Video Script AI',
      description: 'Generate engaging video scripts',
      icon: Video,
      locked: true,
    },
    {
      name: 'Competitor Analysis',
      description: 'AI-powered competitor insights',
      icon: Eye,
      locked: true,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Studio</h1>
          <p className="text-muted-foreground">
            Divine intelligence at your command. Choose your guide.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Zap className="h-3 w-3" />
            47 AI Credits
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 gap-2 bg-transparent p-0 sm:flex sm:w-auto sm:gap-1 sm:bg-muted/50 sm:p-1">
          <TabsTrigger value="overview" className="gap-2 border border-border bg-card data-[state=active]:border-primary/50 sm:border-0 sm:bg-transparent">
            <Star className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="circe" className="gap-2 border border-border bg-card data-[state=active]:border-circe/50 data-[state=active]:bg-circe/20 data-[state=active]:text-circe-light sm:border-0 sm:bg-transparent">
            <Moon className="h-4 w-4" />
            <span className="hidden sm:inline">Circe</span>
          </TabsTrigger>
          <TabsTrigger value="venus" className="gap-2 border border-border bg-card data-[state=active]:border-amber-500/50 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-500 dark:data-[state=active]:text-amber-400 sm:border-0 sm:bg-transparent">
            <Sun className="h-4 w-4" />
            <span className="hidden sm:inline">Venus</span>
          </TabsTrigger>
          <TabsTrigger value="cosmic" className="gap-2 border border-border bg-card data-[state=active]:border-primary/50 sm:border-0 sm:bg-transparent">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Calendar</span>
          </TabsTrigger>
          <TabsTrigger value="tools" className="gap-2 border border-border bg-card data-[state=active]:border-primary/50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500/10 data-[state=active]:via-purple-500/10 data-[state=active]:to-cyan-500/10 sm:border-0 sm:bg-transparent">
            <PenTool className="h-4 w-4 sparkle-icon" />
            <span className="hidden sm:inline rainbow-text font-medium">Tools</span>
          </TabsTrigger>
          <TabsTrigger value="chatter" className="gap-2 border border-border bg-card data-[state=active]:border-primary/50 sm:border-0 sm:bg-transparent">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Chatter</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Divine Assistants */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Circe Card */}
            <Card className="overflow-hidden border-circe/30 bg-gradient-to-br from-circe/5 to-transparent">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-circe/20 p-3 circe-glow">
                    <Moon className="h-6 w-6 text-circe-light" />
                  </div>
                  <div>
                    <CardTitle className="text-circe-light">Circe</CardTitle>
                    <CardDescription>The Enchantress of Retention</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Like the mythological sorceress who kept Odysseus&apos;s men enchanted on her island,
                  Circe AI specializes in keeping your audience captivated and loyal.
                </p>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-circe-light">Domains of Power:</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-circe-light" />
                      <span>Retention Analytics & Predictions</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-circe-light" />
                      <span>Leak Detection & DMCA Protection</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-circe-light" />
                      <span>Churn Risk Analysis</span>
                    </li>
                  </ul>
                </div>
                <Button 
                  onClick={() => setActiveTab('circe')}
                  className="w-full bg-circe/20 text-circe-light hover:bg-circe/30"
                  variant="ghost"
                >
                  Consult Circe
                </Button>
              </CardContent>
            </Card>

            {/* Venus Card - Gold Theme */}
            <Card className="overflow-hidden border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-amber-500/20 p-3 venus-glow">
                    <Sun className="h-6 w-6 text-amber-500 dark:text-amber-400" />
                  </div>
                  <div>
                    <CardTitle className="text-amber-500 dark:text-amber-400">Venus</CardTitle>
                    <CardDescription>The Goddess of Growth</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Embodying love, beauty, and irresistible attraction, Venus AI guides you
                  in drawing new followers and maximizing your magnetic appeal.
                </p>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-amber-500 dark:text-amber-400">Domains of Power:</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                      <span>Growth Strategies & Optimization</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                      <span>Fan Acquisition Insights</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                      <span>Reputation & Sentiment Monitoring</span>
                    </li>
                  </ul>
                </div>
                <Button 
                  onClick={() => setActiveTab('venus')}
                  className="w-full bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 dark:text-amber-400"
                  variant="ghost"
                >
                  Consult Venus
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* AI Tools Grid */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">AI Tools</h2>
              <Button variant="ghost" size="sm" className="text-primary" asChild>
                <Link href="/dashboard/ai-studio/tools">View All</Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {aiTools.map((tool) => (
                <Card 
                  key={tool.id} 
                  className="cursor-pointer border-border transition-all hover:border-primary/50 hover:shadow-md"
                >
                  <CardContent className="flex items-start gap-3 pt-6">
                    <div className={`rounded-lg p-2 ${tool.bgColor}`}>
                      <tool.icon className={`h-5 w-5 ${tool.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{tool.name}</h3>
                        {tool.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {tool.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {tool.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card 
              className="cursor-pointer border-border transition-all hover:border-primary/50"
              onClick={() => setActiveTab('caption')}
            >
              <CardContent className="flex items-center gap-3 pt-6">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Wand2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Caption Generator</h3>
                  <p className="text-sm text-muted-foreground">Create engaging captions</p>
                </div>
              </CardContent>
            </Card>
            <Card 
              className="cursor-pointer border-border transition-all hover:border-primary/50"
              onClick={() => setActiveTab('chatter')}
            >
              <CardContent className="flex items-center gap-3 pt-6">
                <div className="rounded-lg bg-primary/10 p-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">AI Chatter</h3>
                  <p className="text-sm text-muted-foreground">Auto-respond to fans</p>
                </div>
              </CardContent>
            </Card>
            <Card 
              className="cursor-pointer border-border transition-all hover:border-primary/50"
              onClick={() => setActiveTab('cosmic')}
            >
              <CardContent className="flex items-center gap-3 pt-6">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Cosmic Calendar</h3>
                  <p className="text-sm text-muted-foreground">Plan by the stars</p>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer border-border transition-all hover:border-primary/50">
              <CardContent className="flex items-center gap-3 pt-6">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Camera className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Photo Enhancer</h3>
                  <p className="text-sm text-muted-foreground">AI image optimization</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Premium Features */}
          <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-transparent to-venus/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <CardTitle>Premium AI Features</CardTitle>
                </div>
                <Button size="sm">Upgrade to Pro</Button>
              </div>
              <CardDescription>
                Unlock advanced AI capabilities with a Pro subscription
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                {premiumFeatures.map((feature) => (
                  <div 
                    key={feature.name}
                    className="relative overflow-hidden rounded-lg border border-border bg-card/50 p-4"
                  >
                    <div className="absolute right-2 top-2">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <feature.icon className="h-8 w-8 text-primary/50" />
                    <h3 className="mt-3 font-medium">{feature.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Cosmic Calendar Preview */}
          <Card className="border-primary/30">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/20 p-3">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Cosmic Content Calendar</CardTitle>
                  <CardDescription>
                    Align your content with celestial energies
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Our astrology-powered calendar analyzes zodiac cycles, planetary transits,
                and lunar phases to optimize your posting schedule for maximum engagement.
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <div className="text-lg">&#9790;</div>
                  <div className="font-medium">Moon Phase</div>
                  <div className="text-muted-foreground">Waxing Gibbous</div>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <div className="text-lg">&#9792;</div>
                  <div className="font-medium">Venus Transit</div>
                  <div className="text-muted-foreground">In Taurus</div>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <div className="text-lg">&#9791;</div>
                  <div className="font-medium">Mercury</div>
                  <div className="text-venus">Direct</div>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <div className="text-lg">&#9796;</div>
                  <div className="font-medium">Energy</div>
                  <div className="text-primary">High Growth</div>
                </div>
              </div>
              <Button 
                onClick={() => setActiveTab('cosmic')}
                variant="outline"
                className="w-full border-primary/50 text-foreground hover:bg-primary/10 dark:border-primary/30 dark:text-foreground"
              >
                View Full Calendar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Circe Tab */}
        <TabsContent value="circe">
          <CirceAssistant />
        </TabsContent>

        {/* Venus Tab */}
        <TabsContent value="venus">
          <VenusAssistant />
        </TabsContent>

        {/* Cosmic Calendar Tab */}
        <TabsContent value="cosmic">
          <CosmicCalendar />
        </TabsContent>

        {/* AI Tools Tab */}
        <TabsContent value="tools">
          <AIToolsSelector />
        </TabsContent>

        {/* AI Chatter Tab */}
        <TabsContent value="chatter">
          <AIChatterWorkspace />
        </TabsContent>
      </Tabs>
    </div>
  )
}
