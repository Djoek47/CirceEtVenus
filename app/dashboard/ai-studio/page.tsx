import { Metadata } from 'next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Sparkles, 
  MessageSquare, 
  Brain, 
  Wand2, 
  TrendingUp,
  Zap
} from 'lucide-react'
import { CaptionGenerator } from '@/components/ai/caption-generator'
import { RevenueOptimizer } from '@/components/ai/revenue-optimizer'
import { AIChatterWorkspace } from '@/components/ai/ai-chatter-workspace'

export const metadata: Metadata = {
  title: 'AI Studio | CREATRIX',
  description: 'AI-powered tools to boost your content creation and fan engagement',
}

export default function AIStudioPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI Studio
          </h1>
          <p className="text-muted-foreground">
            AI-powered tools to maximize your content performance and revenue
          </p>
        </div>
        <Badge variant="outline" className="w-fit bg-primary/10 text-primary border-primary/30">
          <Zap className="h-3 w-3 mr-1" />
          Powered by AI
        </Badge>
      </div>

      {/* Feature Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Chat Assistant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              AI-powered reply suggestions with upsell detection
            </p>
          </CardContent>
        </Card>
        <Card className="border-green-500/20 bg-gradient-to-br from-green-500/10 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4 text-green-400" />
              Fan Prediction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Predict fan value and optimize engagement
            </p>
          </CardContent>
        </Card>
        <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-purple-400" />
              Caption Generator
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Generate engaging captions and sales copy
            </p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-400" />
              Revenue Optimizer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              AI pricing and strategy recommendations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="chatter" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="chatter" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Chatter</span>
          </TabsTrigger>
          <TabsTrigger value="captions" className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            <span className="hidden sm:inline">Captions</span>
          </TabsTrigger>
          <TabsTrigger value="revenue" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Revenue</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chatter" className="space-y-4">
          <AIChatterWorkspace />
        </TabsContent>

        <TabsContent value="captions" className="space-y-4">
          <CaptionGenerator />
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <RevenueOptimizer />
        </TabsContent>
      </Tabs>
    </div>
  )
}
