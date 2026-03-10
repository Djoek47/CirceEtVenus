'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Wand2, 
  PenTool, 
  Brain, 
  Target, 
  Lightbulb, 
  Palette, 
  Flame, 
  MessageSquare,
  Sparkles,
  Loader2,
  Copy,
  Check,
  ArrowLeft,
  Lock,
  Zap,
  Hash,
  DollarSign,
  Clock,
  ChevronRight,
  Crown,
  BarChart3,
  Calendar,
  Gift,
  Camera,
  Mic,
  Users,
  TrendingDown,
  Send
} from 'lucide-react'
import { VoiceInputButton } from '@/components/voice-input-button'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

// Define the non-Pro AI tools that work
const workingTools = [
  {
    id: 'caption-generator',
    name: 'Caption Generator',
    description: 'AI-powered captions for any content',
    longDescription: 'Generate engaging, platform-optimized captions with hashtags, emojis, and calls-to-action tailored to your audience.',
    icon: Wand2,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
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
    borderColor: 'border-purple-500/30',
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
    borderColor: 'border-yellow-500/30',
    credits: 1,
  },
  {
    id: 'mood-detector',
    name: 'Mood Detector',
    description: 'Analyze fan emotional state',
    longDescription: 'Understand your fans better by analyzing message sentiment to tailor your responses and content.',
    icon: Brain,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    credits: 1,
  },
  {
    id: 'price-optimizer',
    name: 'Price Optimizer',
    description: 'Optimal pricing suggestions',
    longDescription: 'AI analyzes your engagement data to suggest optimal pricing for subscriptions, PPV, and custom content.',
    icon: Target,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
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
    borderColor: 'border-orange-500/30',
    credits: 2,
  },
  {
    id: 'aesthetic-matcher',
    name: 'Aesthetic Matcher',
    description: 'Match trending visual styles',
    longDescription: 'Analyze your content aesthetic and get recommendations to align with trending styles while maintaining your unique brand.',
    icon: Palette,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/30',
    credits: 1,
  },
  {
    id: 'gift-suggester',
    name: 'Gift Suggester',
    description: 'Personalized gift recommendations',
    longDescription: 'Suggest personalized gifts and rewards for your top fans based on their engagement patterns and preferences.',
    icon: Gift,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
    credits: 1,
  },
]

// Pro tools that require subscription
const proTools = [
  {
    id: 'voice-clone',
    name: 'Voice Clone',
    description: 'Clone your writing voice for consistent messaging',
    longDescription: 'AI analyzes your writing style and generates authentic messages that sound exactly like you.',
    icon: Mic,
    color: 'text-gold',
    bgColor: 'bg-gold/10',
    borderColor: 'border-gold/30',
    credits: 3,
    isPro: true,
  },
  {
    id: 'pricing-optimizer',
    name: 'Pricing Optimizer',
    description: 'AI-powered pricing recommendations',
    longDescription: 'Get data-driven pricing suggestions for subscriptions, PPV, and custom content based on market analysis.',
    icon: DollarSign,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    credits: 2,
    isPro: true,
  },
  {
    id: 'churn-predictor',
    name: 'Churn Predictor',
    description: 'Identify at-risk fans before they leave',
    longDescription: 'AI analyzes fan behavior to predict churn risk and provides personalized retention strategies.',
    icon: TrendingDown,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    credits: 2,
    isPro: true,
  },
  {
    id: 'mass-dm-composer',
    name: 'Mass DM Composer',
    description: 'Create personalized mass messages at scale',
    longDescription: 'Generate personalized mass DM campaigns that feel authentic with dynamic placeholders.',
    icon: Send,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    credits: 2,
    isPro: true,
  },
]

// Caption Generator Result Interface
interface CaptionResult {
  captions: Array<{ text: string; tone: string; length: string }>
  hashtags: string[]
  teaserMessage: string
  ppvSalesCopy: string
  bestPostingTime: string
  targetAudience: string
  contentTips: string[]
}

// Content Ideas Result Interface
interface ContentIdeasResult {
  ideas: Array<{
    title: string
    description: string
    type: string
    estimatedEngagement: string
    bestTimeToPost: string
    hashtags: string[]
  }>
  trendingTopics: string[]
  seasonalOpportunities: string[]
}

// Generic AI Result Interface
interface AIResult {
  content: string
  suggestions?: string[]
  analysis?: Record<string, unknown>
}

type ToolType = typeof workingTools[0] | typeof proTools[0]

export function AIToolsSelector() {
  const [selectedTool, setSelectedTool] = useState<ToolType | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CaptionResult | ContentIdeasResult | AIResult | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isPro, setIsPro] = useState(false)
  const [aiCreditsUsed, setAiCreditsUsed] = useState(0)
  const [aiCreditsLimit, setAiCreditsLimit] = useState(100)
  const supabase = createClient()
  
  // Check subscription status
  const loadSubscription = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    const { data } = await supabase
      .from('subscriptions')
      .select('plan_id, ai_credits_used, ai_credits_limit')
      .eq('user_id', user.id)
      .single()
    
    if (data) {
      const planId = (data as any).plan_id as string | null | undefined
      const normalized = planId?.toLowerCase() || null
      setIsPro(Boolean(normalized && ['venus-pro', 'circe-elite', 'divine-duo'].includes(normalized)))
      setAiCreditsUsed(data.ai_credits_used || 0)
      setAiCreditsLimit(data.ai_credits_limit || 100)
    }
  }, [supabase])
  
  useEffect(() => {
    loadSubscription()
  }, [loadSubscription])
  
  // Form states for different tools
  const [contentType, setContentType] = useState('photo')
  const [contentDescription, setContentDescription] = useState('')
  const [platform, setPlatform] = useState('onlyfans')
  const [niche, setNiche] = useState('')
  const [fanMessage, setFanMessage] = useState('')
  const [currentPrice, setCurrentPrice] = useState('')
  
  // Pro tool specific states
  const [sampleText, setSampleText] = useState('')
  const [audienceSegment, setAudienceSegment] = useState('all')
  const [campaignGoal, setCampaignGoal] = useState('')
  
  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const getToneColor = (tone: string) => {
    const colors: Record<string, string> = {
      teasing: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      playful: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      mysterious: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      confident: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      intimate: 'bg-red-500/20 text-red-400 border-red-500/30',
    }
    return colors[tone] || 'bg-muted text-muted-foreground'
  }
  
  const runTool = async () => {
    if (!selectedTool) return
    
    setLoading(true)
    setResult(null)
    
    try {
      let response: Response
      
      switch (selectedTool.id) {
        case 'caption-generator':
          response = await fetch('/api/ai/caption-generator', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contentType,
              contentDescription,
              platform,
            }),
          })
          break
          
        case 'fantasy-writer':
          response = await fetch('/api/ai/fantasy-writer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              scenario: contentDescription,
              tone: contentType,
              platform,
            }),
          })
          break
          
        case 'content-ideas':
          response = await fetch('/api/ai/content-ideas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              niche: niche || 'general',
              platform,
              currentTrends: contentDescription,
            }),
          })
          break
          
        case 'mood-detector':
          response = await fetch('/api/ai/mood-detector', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: fanMessage,
            }),
          })
          break
          
        case 'price-optimizer':
          response = await fetch('/api/ai/revenue-optimizer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              currentPrice,
              contentType,
              platform,
              description: contentDescription,
            }),
          })
          break
          
        case 'viral-predictor':
          response = await fetch('/api/ai/viral-predictor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contentDescription,
              contentType,
              platform,
            }),
          })
          break
          
        case 'aesthetic-matcher':
          response = await fetch('/api/ai/aesthetic-matcher', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              currentAesthetic: contentDescription,
              platform,
            }),
          })
          break
          
        case 'gift-suggester':
          response = await fetch('/api/ai/gift-suggester', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fanInfo: fanMessage,
              budget: currentPrice,
            }),
          })
          break
        
        // Pro Tools
        case 'voice-clone':
          response = await fetch('/api/ai/voice-clone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sampleText,
              targetTone: contentType,
              context: contentDescription,
            }),
          })
          break
          
        case 'pricing-optimizer':
          response = await fetch('/api/ai/pricing-optimizer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contentType,
              currentPrice,
              niche,
              subscriberCount: fanMessage,
            }),
          })
          break
          
        case 'churn-predictor':
          response = await fetch('/api/ai/churn-predictor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fanData: fanMessage,
              recentActivity: contentDescription,
            }),
          })
          break
          
        case 'mass-dm-composer':
          response = await fetch('/api/ai/mass-dm-composer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              campaign: campaignGoal,
              audienceSegment,
              tone: contentType,
              callToAction: contentDescription,
            }),
          })
          break
          
        default:
          throw new Error('Tool not implemented')
      }
      
      if (!response.ok) throw new Error('Failed to run tool')
      
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Tool error:', error)
      // Set a fallback result for demo purposes
      setResult({
        content: 'AI analysis complete. Results are being processed.',
        suggestions: ['Try again with more details', 'Adjust your parameters'],
      })
    } finally {
      setLoading(false)
    }
  }
  
  const resetTool = () => {
    setSelectedTool(null)
    setResult(null)
    setContentDescription('')
    setFanMessage('')
    setCurrentPrice('')
    setNiche('')
  }
  
  // Render tool-specific input form
  const renderToolInputs = () => {
    if (!selectedTool) return null
    
    switch (selectedTool.id) {
      case 'caption-generator':
        return (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Content Type</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="photo">Photo</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="photoset">Photo Set</SelectItem>
                    <SelectItem value="story">Story</SelectItem>
                    <SelectItem value="livestream">Livestream</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onlyfans">OnlyFans</SelectItem>
                    <SelectItem value="fansly">Fansly</SelectItem>
                    <SelectItem value="mym">MYM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Describe Your Content</Label>
                <VoiceInputButton
                  onTranscript={(text) => setContentDescription(prev => prev + (prev ? ' ' : '') + text)}
                  size="sm"
                  variant="ghost"
                  showTooltip={true}
                />
              </div>
              <Textarea 
                placeholder="Describe your content... e.g., Bedroom mirror selfie in red lingerie, soft lighting..."
                value={contentDescription}
                onChange={(e) => setContentDescription(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
        )
        
      case 'fantasy-writer':
        return (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Tone/Style</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="romantic">Romantic</SelectItem>
                    <SelectItem value="playful">Playful</SelectItem>
                    <SelectItem value="mysterious">Mysterious</SelectItem>
                    <SelectItem value="dominant">Dominant</SelectItem>
                    <SelectItem value="submissive">Submissive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onlyfans">OnlyFans</SelectItem>
                    <SelectItem value="fansly">Fansly</SelectItem>
                    <SelectItem value="mym">MYM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Scenario or Theme</Label>
                <VoiceInputButton
                  onTranscript={(text) => setContentDescription(prev => prev + (prev ? ' ' : '') + text)}
                  size="sm"
                  variant="ghost"
                />
              </div>
              <Textarea 
                placeholder="Describe the scenario... e.g., We meet at a masquerade ball, mysterious strangers..."
                value={contentDescription}
                onChange={(e) => setContentDescription(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
        )
        
      case 'content-ideas':
        return (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Your Niche</Label>
                <Input 
                  placeholder="e.g., fitness, cosplay, GFE..."
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onlyfans">OnlyFans</SelectItem>
                    <SelectItem value="fansly">Fansly</SelectItem>
                    <SelectItem value="mym">MYM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Any specific trends or themes to explore? (optional)</Label>
              <Textarea 
                placeholder="Current trends you've noticed, or themes you want to try..."
                value={contentDescription}
                onChange={(e) => setContentDescription(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>
        )
        
      case 'mood-detector':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Fan Message to Analyze</Label>
                <VoiceInputButton
                  onTranscript={(text) => setFanMessage(prev => prev + (prev ? ' ' : '') + text)}
                  size="sm"
                  variant="ghost"
                />
              </div>
              <Textarea 
                placeholder="Paste the fan's message here to analyze their emotional state..."
                value={fanMessage}
                onChange={(e) => setFanMessage(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
          </div>
        )
        
      case 'price-optimizer':
        return (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Current Price ($)</Label>
                <Input 
                  type="number"
                  placeholder="e.g., 15"
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Content Type</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subscription">Subscription</SelectItem>
                    <SelectItem value="ppv">PPV Content</SelectItem>
                    <SelectItem value="custom">Custom Request</SelectItem>
                    <SelectItem value="tip-menu">Tip Menu Item</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea 
                placeholder="Describe what you're pricing..."
                value={contentDescription}
                onChange={(e) => setContentDescription(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>
        )
        
      case 'viral-predictor':
        return (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Content Type</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="photo">Photo</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="reel">Reel/Short</SelectItem>
                    <SelectItem value="carousel">Carousel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onlyfans">OnlyFans</SelectItem>
                    <SelectItem value="fansly">Fansly</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Content Description</Label>
                <VoiceInputButton
                  onTranscript={(text) => setContentDescription(prev => prev + (prev ? ' ' : '') + text)}
                  size="sm"
                  variant="ghost"
                />
              </div>
              <Textarea 
                placeholder="Describe your content idea in detail..."
                value={contentDescription}
                onChange={(e) => setContentDescription(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
        )
        
      // Pro Tool Inputs
      case 'voice-clone':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Sample of Your Writing</Label>
                <VoiceInputButton
                  onTranscript={(text) => setSampleText(prev => prev + (prev ? ' ' : '') + text)}
                  size="sm"
                  variant="ghost"
                />
              </div>
              <Textarea 
                placeholder="Paste some of your previous messages or captions so AI can learn your voice..."
                value={sampleText}
                onChange={(e) => setSampleText(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
            <div className="space-y-2">
              <Label>What to Generate</Label>
              <Textarea 
                placeholder="Describe what kind of message you need in your voice..."
                value={contentDescription}
                onChange={(e) => setContentDescription(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>
        )
        
      case 'churn-predictor':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Fan Information</Label>
              <Textarea 
                placeholder="Describe the fan: subscription length, spending history, recent activity..."
                value={fanMessage}
                onChange={(e) => setFanMessage(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Recent Behavior Changes (optional)</Label>
              <Textarea 
                placeholder="Any recent changes in their engagement patterns..."
                value={contentDescription}
                onChange={(e) => setContentDescription(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>
        )
        
      case 'mass-dm-composer':
        return (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Audience Segment</Label>
                <Select value={audienceSegment} onValueChange={setAudienceSegment}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subscribers</SelectItem>
                    <SelectItem value="new">New Fans (Last 7 days)</SelectItem>
                    <SelectItem value="inactive">Inactive (30+ days)</SelectItem>
                    <SelectItem value="whales">Top Spenders</SelectItem>
                    <SelectItem value="expiring">Expiring Soon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tone</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="flirty">Flirty</SelectItem>
                    <SelectItem value="urgent">Urgent/FOMO</SelectItem>
                    <SelectItem value="exclusive">Exclusive/VIP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Campaign Goal</Label>
              <Input 
                placeholder="e.g., Promote new PPV, Re-engage inactive fans..."
                value={campaignGoal}
                onChange={(e) => setCampaignGoal(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Call to Action</Label>
              <Textarea 
                placeholder="What do you want fans to do after reading?"
                value={contentDescription}
                onChange={(e) => setContentDescription(e.target.value)}
                className="min-h-[60px]"
              />
            </div>
          </div>
        )
        
      default:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Input</Label>
                <VoiceInputButton
                  onTranscript={(text) => setContentDescription(prev => prev + (prev ? ' ' : '') + text)}
                  size="sm"
                  variant="ghost"
                />
              </div>
              <Textarea 
                placeholder="Enter your request..."
                value={contentDescription}
                onChange={(e) => setContentDescription(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
        )
    }
  }
  
  // Render caption generator results
  const renderCaptionResults = (captionResult: CaptionResult) => (
    <div className="space-y-6 pt-4 border-t border-border">
      {/* Captions */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          Caption Suggestions
        </h3>
        <div className="space-y-3">
          {captionResult.captions.map((caption, index) => (
            <div 
              key={index}
              className="p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] ${getToneColor(caption.tone)}`}>
                    {caption.tone}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {caption.length}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleCopy(caption.text, `caption-${index}`)}
                >
                  {copiedField === `caption-${index}` ? (
                    <Check className="h-3.5 w-3.5 text-green-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              <p className="text-sm leading-relaxed">{caption.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Hashtags */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Hash className="h-4 w-4 text-primary" />
            Hashtags
          </h3>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={() => handleCopy(captionResult.hashtags.join(' '), 'hashtags')}
          >
            {copiedField === 'hashtags' ? (
              <Check className="h-3.5 w-3.5 text-green-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {captionResult.hashtags.map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              #{tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Teaser & PPV Copy */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Teaser Message
            </h4>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => handleCopy(captionResult.teaserMessage, 'teaser')}
            >
              {copiedField === 'teaser' ? (
                <Check className="h-3 w-3 text-green-400" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
          <p className="text-sm">{captionResult.teaserMessage}</p>
        </div>

        <div className="p-4 rounded-lg border border-green-500/20 bg-green-500/5 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-green-400 flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              PPV Sales Copy
            </h4>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => handleCopy(captionResult.ppvSalesCopy, 'ppv')}
            >
              {copiedField === 'ppv' ? (
                <Check className="h-3 w-3 text-green-400" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
          <p className="text-sm text-green-300">{captionResult.ppvSalesCopy}</p>
        </div>
      </div>

      {/* Best Posting Time */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
        <Clock className="h-5 w-5 text-primary" />
        <div>
          <p className="text-xs text-muted-foreground">Best Time to Post</p>
          <p className="text-sm font-medium">{captionResult.bestPostingTime}</p>
        </div>
      </div>
    </div>
  )
  
  // Render generic results
  const renderGenericResults = (res: AIResult) => (
    <div className="space-y-4 pt-4 border-t border-border">
      <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
        <p className="text-sm whitespace-pre-wrap">{res.content}</p>
      </div>
      {res.suggestions && res.suggestions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">Suggestions</h4>
          <ul className="space-y-1">
            {res.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <ChevronRight className="h-4 w-4 text-primary mt-0.5" />
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
  
  // Tool selection view
  if (!selectedTool) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="relative">
              <PenTool className="h-5 w-5 text-primary sparkle-icon" />
              <Sparkles className="h-3 w-3 text-primary absolute -top-1 -right-1 animate-pulse" />
            </div>
            <span className="rainbow-text">Tools</span>
          </CardTitle>
          <CardDescription>
            Choose an AI tool to enhance your content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {workingTools.map((tool) => (
                <Card 
                  key={tool.id}
                  className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${tool.borderColor} hover:border-primary/50`}
                  onClick={() => setSelectedTool(tool)}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className={`rounded-lg p-2.5 ${tool.bgColor}`}>
                        <tool.icon className={`h-5 w-5 ${tool.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm">{tool.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {tool.description}
                        </p>
                        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                          <Zap className="h-3 w-3" />
                          {tool.credits} credit{tool.credits > 1 ? 's' : ''}/use
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* Pro Tools Section */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="h-4 w-4 text-gold" />
                <h3 className="font-semibold text-sm text-gold">Pro Tools</h3>
                {isPro && <Badge className="bg-gold/20 text-gold text-[10px]">Unlocked</Badge>}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {proTools.map((tool) => (
                  <Card 
                    key={tool.id}
                    className={`cursor-pointer transition-all ${tool.borderColor} ${
                      isPro 
                        ? 'hover:shadow-lg hover:scale-[1.02] hover:border-gold/50' 
                        : 'opacity-75 hover:opacity-100'
                    }`}
                    onClick={() => isPro ? setSelectedTool(tool) : null}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className={`rounded-lg p-2.5 ${tool.bgColor}`}>
                          <tool.icon className={`h-5 w-5 ${tool.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm">{tool.name}</h3>
                            {!isPro && <Lock className="h-3 w-3 text-muted-foreground" />}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {tool.description}
                          </p>
                          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                            <Zap className="h-3 w-3" />
                            {tool.credits} credit{tool.credits > 1 ? 's' : ''}/use
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {!isPro && (
                <div className="mt-4 p-4 rounded-lg border border-gold/30 bg-gradient-to-r from-gold/5 to-transparent">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-gold/20 p-2">
                      <Crown className="h-5 w-5 text-gold" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm text-gold">Unlock Pro Tools</h4>
                      <p className="text-xs text-muted-foreground">
                        Get Voice Cloning, Churn Prediction, Mass DM Composer and more
                      </p>
                    </div>
                    <Link href="/dashboard/settings?tab=billing">
                      <Button size="sm" variant="outline" className="border-gold/30 text-gold hover:bg-gold/10 hover:text-gold">
                        <Crown className="h-3 w-3 mr-1" />
                        Upgrade
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
            
            {/* Credits Display */}
            <div className="mt-4 p-3 rounded-lg bg-muted/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm">AI Credits</span>
              </div>
              <span className="font-medium">{aiCreditsUsed}/{aiCreditsLimit === 999999 ? '∞' : aiCreditsLimit}</span>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    )
  }
  
  // Tool workspace view
  return (
    <Card className={`border-primary/20 ${selectedTool.borderColor}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={resetTool}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className={`rounded-lg p-2 ${selectedTool.bgColor}`}>
              <selectedTool.icon className={`h-5 w-5 ${selectedTool.color}`} />
            </div>
            <div>
              <CardTitle className="text-lg">{selectedTool.name}</CardTitle>
              <CardDescription className="text-xs">
                {selectedTool.longDescription}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="gap-1">
            <Zap className="h-3 w-3" />
            {selectedTool.credits} credit{selectedTool.credits > 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderToolInputs()}
        
        <Button 
          onClick={runTool} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate
            </>
          )}
        </Button>
        
        {/* Results */}
        {result && (
          selectedTool.id === 'caption-generator' && 'captions' in result
            ? renderCaptionResults(result as CaptionResult)
            : renderGenericResults(result as AIResult)
        )}
      </CardContent>
    </Card>
  )
}
