'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Star,
  PenTool,
  Wand2,
  Sparkles,
  Zap,
  Lock,
  Music,
  Video,
  Eye,
} from 'lucide-react'
import { AIToolsLibrary } from '@/components/ai/ai-tools-library'
import { MediaVaultHub } from '@/components/ai/media-vault-hub'
import { createClient } from '@/lib/supabase/client'

export default function AIStudioPage() {
  const searchParams = useSearchParams()

  const initialTab = (() => {
    const tab = searchParams.get('tab')
    if (tab === 'tools') return 'tools'
    if (tab === 'library' || tab === 'vault') return 'library'
    // Deprecated query params → library
    if (tab === 'cosmic' || tab === 'chatter' || tab === 'overview') return 'library'
    const ai = searchParams.get('ai')
    if (ai === 'circe' || ai === 'venus') return 'library'
    return 'library'
  })()

  const [activeTab, setActiveTab] = useState(initialTab)
  const [isPro, setIsPro] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const loadSubscription = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
          .from('subscriptions')
          .select('plan_id')
          .eq('user_id', user.id)
          .maybeSingle()
        const rawPlanId = (data as { plan_id?: string } | null)?.plan_id
        const normalizedPlanId = rawPlanId?.toLowerCase() || null
        if (normalizedPlanId && ['venus-pro', 'circe-elite', 'divine-duo'].includes(normalizedPlanId)) {
          setIsPro(true)
        }
      } catch {
        // ignore
      }
    }
    loadSubscription()
  }, [])

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
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">AI Studio</h1>
          <p className="text-muted-foreground">
            Media vault for Divine, safe photo touch-ups, and the full tools library.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Zap className="h-3 w-3" />
            AI Studio
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 gap-2 bg-transparent p-0 sm:flex sm:w-auto sm:gap-1 sm:bg-muted/50 sm:p-1">
          <TabsTrigger value="library" className="gap-2 border border-border bg-card data-[state=active]:border-primary/50 sm:border-0 sm:bg-transparent">
            <Star className="h-4 w-4" />
            <span>Media &amp; Vault</span>
          </TabsTrigger>
          <TabsTrigger
            value="tools"
            className="gap-2 border border-border bg-card data-[state=active]:border-primary/50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500/10 data-[state=active]:via-purple-500/10 data-[state=active]:to-cyan-500/10 sm:border-0 sm:bg-transparent"
          >
            <PenTool className="h-4 w-4 sparkle-icon" />
            <span className="rainbow-text font-medium">Tools</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-6">
          <MediaVaultHub />

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">Quick links</CardTitle>
              <CardDescription>Scheduling and posting live on the Content page.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" asChild>
                <Link href="/dashboard/content">Content schedule</Link>
              </Button>
              <Button variant="secondary" size="sm" asChild>
                <Link href="/dashboard/divine-manager">Divine Manager</Link>
              </Button>
              <Button variant="secondary" size="sm" asChild>
                <Link href="/dashboard/messages">Messages</Link>
              </Button>
            </CardContent>
          </Card>

          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Featured tools</h2>
              <Button variant="ghost" size="sm" className="text-primary" asChild>
                <Link href="/dashboard/ai-studio/tools">View all</Link>
              </Button>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">
              Open the Tools tab for the full library. Each run uses AI credits where noted.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { name: 'Caption Generator', desc: 'Captions and sales copy', icon: Wand2 },
                { name: 'Churn Predictor', desc: 'Retention from CRM + thread context', icon: Sparkles },
                { name: 'Standard of Attraction', desc: 'Pro content rating', icon: Star },
              ].map((t) => (
                <Card
                  key={t.name}
                  className="cursor-pointer border-border transition-all hover:border-primary/50 hover:shadow-md"
                  onClick={() => setActiveTab('tools')}
                >
                  <CardContent className="flex items-start gap-3 pt-6">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <t.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{t.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {!isPro && (
            <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-transparent to-amber-500/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <CardTitle>Premium AI</CardTitle>
                  </div>
                  <Button size="sm" asChild>
                    <Link href="/dashboard/settings?tab=billing#pricing-plans">Upgrade to Pro</Link>
                  </Button>
                </div>
                <CardDescription>Unlock higher limits and Pro-only tools.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  {premiumFeatures.map((feature) => (
                    <div key={feature.name} className="relative overflow-hidden rounded-lg border border-border bg-card/50 p-4">
                      <div className="absolute right-2 top-2">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <feature.icon className="h-8 w-8 text-primary/50" />
                      <h3 className="mt-3 font-medium">{feature.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tools">
          <AIToolsLibrary compact />
        </TabsContent>
      </Tabs>
    </div>
  )
}
