'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Moon, 
  Shield, 
  BarChart3, 
  Users, 
  AlertTriangle,
  TrendingDown,
  Send,
  Sparkles,
  Lock,
  Eye
} from 'lucide-react'

interface ChurnRiskFan {
  id: string
  username: string
  platform: string
  riskLevel: 'high' | 'medium' | 'low'
  lastActive: string
  daysInactive: number
  totalSpent: number
  recommendation: string
}

interface LeakAlert {
  id: string
  source: string
  type: string
  severity: 'critical' | 'high' | 'medium'
  detectedAt: string
  status: 'active' | 'investigating' | 'resolved'
}

// Sample data
const churnRiskFans: ChurnRiskFan[] = [
  {
    id: '1',
    username: 'diamond_lover',
    platform: 'OnlyFans',
    riskLevel: 'high',
    lastActive: '12 days ago',
    daysInactive: 12,
    totalSpent: 847,
    recommendation: 'Send a personalized message with exclusive preview. High spender at risk of churning.'
  },
  {
    id: '2',
    username: 'gold_member_22',
    platform: 'Fansly',
    riskLevel: 'medium',
    lastActive: '7 days ago',
    daysInactive: 7,
    totalSpent: 423,
    recommendation: 'Offer a limited-time discount on PPV content to re-engage.'
  },
  {
    id: '3',
    username: 'casual_fan',
    platform: 'MYM',
    riskLevel: 'low',
    lastActive: '3 days ago',
    daysInactive: 3,
    totalSpent: 156,
    recommendation: 'Standard engagement - respond to any pending messages.'
  },
]

const leakAlerts: LeakAlert[] = [
  {
    id: '1',
    source: 'Reddit',
    type: 'Image leak',
    severity: 'critical',
    detectedAt: '2 hours ago',
    status: 'investigating'
  },
  {
    id: '2',
    source: 'Telegram',
    type: 'Video repost',
    severity: 'high',
    detectedAt: '1 day ago',
    status: 'active'
  },
]

export function CirceAssistant() {
  const [message, setMessage] = useState('')
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'circe', content: string}>>([
    {
      role: 'circe',
      content: "Greetings, creator. I am Circe, guardian of your realm. Like the enchantress of old, I shall help you keep your admirers captivated and protect what is yours. What wisdom do you seek?"
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
        "I sense disturbance in your fan realm. Three of your most devoted followers show signs of wandering. Let me craft personalized enchantments to draw them back...",
        "Your content vault remains secure, though I detected unauthorized eyes upon your work from the eastern digital shores. I have initiated protective measures.",
        "The stars align favorably for retention today. Mercury direct brings clarity to communication - now is the time to reach out to dormant admirers.",
        "I have analyzed the patterns of your most loyal subjects. Those who engage on Tuesdays between 8-10 PM show 47% higher lifetime value. Shall I prepare a targeted campaign?",
      ]
      setChatMessages(prev => [...prev, { 
        role: 'circe', 
        content: responses[Math.floor(Math.random() * responses.length)]
      }])
      setIsLoading(false)
    }, 1500)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-circe/30 bg-gradient-to-r from-circe/10 to-transparent">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-circe/20 p-4 circe-glow">
              <Moon className="h-8 w-8 text-circe-light" />
            </div>
            <div>
              <CardTitle className="text-xl text-circe-light">Circe - The Enchantress</CardTitle>
              <CardDescription className="font-serif">
                Retention, Analytics & Protection
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chat Interface */}
        <Card className="lg:col-span-2 border-circe/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-circe-light" />
              Consult Circe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-[300px] overflow-y-auto space-y-4 rounded-lg bg-muted/30 p-4">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.role === 'user' 
                      ? 'bg-primary/20 text-foreground' 
                      : 'bg-circe/20 text-circe-light'
                  }`}>
                    {msg.role === 'circe' && (
                      <div className="text-xs font-medium text-circe-light/70 mb-1">Circe</div>
                    )}
                    <p className="text-sm font-serif">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-circe/20 rounded-lg px-4 py-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-circe-light rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-circe-light rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-2 h-2 bg-circe-light rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Input 
                placeholder="Ask Circe about retention, analytics, or protection..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="border-circe/30 focus-visible:ring-circe"
              />
              <Button 
                onClick={handleSendMessage}
                className="bg-circe hover:bg-circe/80 text-circe-foreground"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="space-y-4">
          <Card className="border-circe/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-circe-light" />
                Retention Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-circe-light">87%</div>
              <p className="text-xs text-muted-foreground">+3% from last month</p>
            </CardContent>
          </Card>
          <Card className="border-circe/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-circe-light" />
                At-Risk Fans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-circe-light">12</div>
              <p className="text-xs text-muted-foreground">Require attention</p>
            </CardContent>
          </Card>
          <Card className="border-circe/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-circe-light" />
                Leak Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">2</div>
              <p className="text-xs text-muted-foreground">Active investigations</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs for Detailed Views */}
      <Tabs defaultValue="churn" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="churn" className="gap-2 data-[state=active]:bg-circe/20 data-[state=active]:text-circe-light">
            <TrendingDown className="h-4 w-4" />
            Churn Risk
          </TabsTrigger>
          <TabsTrigger value="protection" className="gap-2 data-[state=active]:bg-circe/20 data-[state=active]:text-circe-light">
            <Shield className="h-4 w-4" />
            Protection
          </TabsTrigger>
        </TabsList>

        <TabsContent value="churn" className="space-y-4">
          <Card className="border-circe/20">
            <CardHeader>
              <CardTitle className="text-sm">Fans at Risk of Churning</CardTitle>
              <CardDescription className="font-serif">
                Circe&apos;s enchantment analysis reveals these fans need attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {churnRiskFans.map((fan) => (
                  <div key={fan.id} className="flex items-start justify-between rounded-lg border border-circe/20 p-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{fan.username}</span>
                        <Badge variant="outline" className="text-xs">{fan.platform}</Badge>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            fan.riskLevel === 'high' ? 'border-destructive text-destructive' :
                            fan.riskLevel === 'medium' ? 'border-primary text-primary' :
                            'border-muted-foreground text-muted-foreground'
                          }`}
                        >
                          {fan.riskLevel} risk
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Last active: {fan.lastActive} | Total spent: ${fan.totalSpent}
                      </p>
                      <p className="text-sm font-serif text-circe-light/80">
                        <Sparkles className="h-3 w-3 inline mr-1" />
                        {fan.recommendation}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="border-circe/30 text-circe-light hover:bg-circe/10">
                      Re-engage
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="protection" className="space-y-4">
          <Card className="border-circe/20">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Active Leak Alerts
              </CardTitle>
              <CardDescription className="font-serif">
                Circe guards your content across the digital realm
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leakAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                    <div className="flex items-center gap-4">
                      <div className="rounded-full bg-destructive/20 p-2">
                        {alert.severity === 'critical' ? (
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                        ) : (
                          <Eye className="h-5 w-5 text-destructive" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{alert.type}</span>
                          <Badge variant="outline" className="text-xs border-destructive/50 text-destructive">
                            {alert.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {alert.source} | Detected {alert.detectedAt}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {alert.status}
                      </Badge>
                      <Button size="sm" variant="outline" className="border-circe/30 text-circe-light hover:bg-circe/10">
                        <Lock className="h-4 w-4 mr-1" />
                        DMCA
                      </Button>
                    </div>
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
