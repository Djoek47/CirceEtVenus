'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Wand2, 
  Hash, 
  MessageSquare, 
  DollarSign, 
  Clock,
  Copy,
  Check,
  Loader2,
  Sparkles,
  Mic
} from 'lucide-react'
import { VoiceInputButton } from '@/components/voice-input-button'

interface Caption {
  text: string
  tone: string
  length: string
}

interface CaptionResult {
  captions: Caption[]
  hashtags: string[]
  teaserMessage: string
  ppvSalesCopy: string
  bestPostingTime: string
  targetAudience: string
  contentTips: string[]
}

export function CaptionGenerator() {
  const [contentType, setContentType] = useState('photo')
  const [contentDescription, setContentDescription] = useState('')
  const [platform, setPlatform] = useState('onlyfans')
  const [result, setResult] = useState<CaptionResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const generateCaptions = async () => {
    if (!contentDescription.trim()) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/ai/caption-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          contentDescription,
          platform,
        }),
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Failed to generate captions:', error)
    } finally {
      setLoading(false)
    }
  }

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

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          AI Caption Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Form */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="contentType">Content Type</Label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger id="contentType">
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
            <Label htmlFor="platform">Platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger id="platform">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="onlyfans">OnlyFans</SelectItem>
                <SelectItem value="fansly">Fansly</SelectItem>
                <SelectItem value="mym">MYM</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-1">
            <Label>&nbsp;</Label>
            <Button 
              onClick={generateCaptions} 
              disabled={loading || !contentDescription.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="description">Describe Your Content</Label>
            <VoiceInputButton
              onTranscript={(text) => setContentDescription(prev => prev + (prev ? ' ' : '') + text)}
              size="sm"
              variant="ghost"
              showTooltip={true}
            />
          </div>
          <Textarea 
            id="description"
            placeholder="Describe or speak about your content... e.g., Bedroom mirror selfie in red lingerie, soft lighting, playful pose..."
            value={contentDescription}
            onChange={(e) => setContentDescription(e.target.value)}
            className="min-h-[80px]"
          />
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-6 pt-4 border-t border-border">
            {/* Captions */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Caption Suggestions
              </h3>
              <div className="space-y-3">
                {result.captions.map((caption, index) => (
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
                  onClick={() => handleCopy(result.hashtags.join(' '), 'hashtags')}
                >
                  {copiedField === 'hashtags' ? (
                    <Check className="h-3.5 w-3.5 text-green-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.hashtags.map((tag, index) => (
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
                    onClick={() => handleCopy(result.teaserMessage, 'teaser')}
                  >
                    {copiedField === 'teaser' ? (
                      <Check className="h-3 w-3 text-green-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                <p className="text-sm">{result.teaserMessage}</p>
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
                    onClick={() => handleCopy(result.ppvSalesCopy, 'ppv')}
                  >
                    {copiedField === 'ppv' ? (
                      <Check className="h-3 w-3 text-green-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                <p className="text-sm text-green-300">{result.ppvSalesCopy}</p>
              </div>
            </div>

            {/* Best Posting Time */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Best Time to Post</p>
                <p className="text-sm font-medium">{result.bestPostingTime}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
