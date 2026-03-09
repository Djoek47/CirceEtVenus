'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Moon, Sun, Star, Shield, TrendingUp, Users, BarChart3, Calendar } from 'lucide-react'
import { CirceAssistant } from '@/components/ai/circe-assistant'
import { VenusAssistant } from '@/components/ai/venus-assistant'
import { CosmicCalendar } from '@/components/ai/cosmic-calendar'

export default function AIStudioPage() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Studio</h1>
        <p className="font-serif text-muted-foreground">
          Divine intelligence at your command. Choose your guide.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-muted/50">
          <TabsTrigger value="overview" className="gap-2">
            <Star className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="circe" className="gap-2 data-[state=active]:bg-circe/20 data-[state=active]:text-circe-light">
            <Moon className="h-4 w-4" />
            Circe
          </TabsTrigger>
          <TabsTrigger value="venus" className="gap-2 data-[state=active]:bg-venus/20 data-[state=active]:text-venus-foreground">
            <Sun className="h-4 w-4" />
            Venus
          </TabsTrigger>
          <TabsTrigger value="cosmic" className="gap-2">
            <Calendar className="h-4 w-4" />
            Cosmic Calendar
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
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
                    <CardDescription className="font-serif">The Enchantress of Retention</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="font-serif text-sm text-muted-foreground">
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
                <button 
                  onClick={() => setActiveTab('circe')}
                  className="w-full rounded-lg bg-circe/20 py-2 text-sm font-medium text-circe-light transition-colors hover:bg-circe/30"
                >
                  Consult Circe
                </button>
              </CardContent>
            </Card>

            {/* Venus Card */}
            <Card className="overflow-hidden border-venus/30 bg-gradient-to-br from-venus/5 to-transparent">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-venus/20 p-3 venus-glow">
                    <Sun className="h-6 w-6 text-venus" />
                  </div>
                  <div>
                    <CardTitle className="text-venus">Venus</CardTitle>
                    <CardDescription className="font-serif">The Goddess of Growth</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="font-serif text-sm text-muted-foreground">
                  Embodying love, beauty, and irresistible attraction, Venus AI guides you
                  in drawing new followers and maximizing your magnetic appeal.
                </p>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-venus">Domains of Power:</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-venus" />
                      <span>Growth Strategies & Optimization</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-venus" />
                      <span>Fan Acquisition Insights</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-venus" />
                      <span>Reputation & Sentiment Monitoring</span>
                    </li>
                  </ul>
                </div>
                <button 
                  onClick={() => setActiveTab('venus')}
                  className="w-full rounded-lg bg-venus/20 py-2 text-sm font-medium text-venus transition-colors hover:bg-venus/30"
                >
                  Consult Venus
                </button>
              </CardContent>
            </Card>
          </div>

          {/* Cosmic Calendar Preview */}
          <Card className="border-primary/30">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/20 p-3">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Cosmic Content Calendar</CardTitle>
                  <CardDescription className="font-serif">
                    Align your content with celestial energies
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="font-serif text-sm text-muted-foreground">
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
              <button 
                onClick={() => setActiveTab('cosmic')}
                className="w-full rounded-lg bg-primary/20 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/30"
              >
                View Full Calendar
              </button>
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
      </Tabs>
    </div>
  )
}
