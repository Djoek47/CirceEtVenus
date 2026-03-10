'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Share2, 
  Copy, 
  ExternalLink, 
  Check,
  Sparkles,
  Link2,
  MessageSquare,
  Hash,
  Loader2,
} from 'lucide-react'

// X (Twitter) icon
function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

// Instagram icon
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  )
}

// TikTok icon
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  )
}

interface SocialPromotionProps {
  connections: { platform: string; platform_username: string; is_connected: boolean }[]
}

const socialPlatforms = [
  { 
    id: 'twitter', 
    name: 'X (Twitter)', 
    icon: XIcon, 
    color: '#000000',
    shareUrl: (text: string, url: string) => 
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    charLimit: 280
  },
  { 
    id: 'instagram', 
    name: 'Instagram', 
    icon: InstagramIcon, 
    color: '#E4405F',
    shareUrl: null, // Instagram doesn't have direct sharing URL, copy text instead
    charLimit: 2200
  },
  { 
    id: 'tiktok', 
    name: 'TikTok', 
    icon: TikTokIcon, 
    color: '#000000',
    shareUrl: null, // TikTok doesn't have direct sharing URL
    charLimit: 2200
  },
]

const promoTemplates = [
  {
    name: 'New Content',
    template: "New exclusive content just dropped! Don't miss out on what you've been waiting for... Link in bio!",
    hashtags: ['newcontent', 'exclusive', 'linkinbio']
  },
  {
    name: 'Sale/Discount',
    template: "LIMITED TIME OFFER! Subscribe now and get a special discount. Don't wait, this won't last long!",
    hashtags: ['sale', 'discount', 'limitedtime', 'subscribe']
  },
  {
    name: 'Behind the Scenes',
    template: "Ever wonder what goes on behind the scenes? Come see what you're missing! Link in bio.",
    hashtags: ['behindthescenes', 'bts', 'exclusive', 'linkinbio']
  },
  {
    name: 'Engagement',
    template: "Question of the day: What content would you like to see more of? Comment below!",
    hashtags: ['questionoftheday', 'engagement', 'community']
  },
]

export function SocialPromotion({ connections }: SocialPromotionProps) {
  const [postText, setPostText] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [hashtags, setHashtags] = useState<string[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const connectedPlatformLinks = connections.map(c => ({
    platform: c.platform,
    username: c.platform_username,
    url: c.platform === 'onlyfans' 
      ? `https://onlyfans.com/${c.platform_username}`
      : c.platform === 'fansly'
      ? `https://fansly.com/${c.platform_username}`
      : ''
  }))

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const generateWithAI = async () => {
    setIsGenerating(true)
    // Simulate AI generation - in production this would call an AI API
    setTimeout(() => {
      setPostText("Just dropped something special for my VIPs! If you've been on the fence, now's the time to join. Trust me, you don't want to miss this one...")
      setHashtags(['exclusive', 'newdrop', 'linkinbio', 'dontmiss'])
      setIsGenerating(false)
    }, 1500)
  }

  const applyTemplate = (template: typeof promoTemplates[0]) => {
    setPostText(template.template)
    setHashtags(template.hashtags)
  }

  const fullPostText = postText + (hashtags.length > 0 ? '\n\n' + hashtags.map(h => `#${h}`).join(' ') : '')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Social Media Promotion</h2>
        <p className="text-muted-foreground">
          Create and share promotional content across your social platforms
        </p>
      </div>

      <Tabs defaultValue="create" className="space-y-6">
        <TabsList>
          <TabsTrigger value="create" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Create Post
          </TabsTrigger>
          <TabsTrigger value="links" className="gap-2">
            <Link2 className="h-4 w-4" />
            Quick Links
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Post Editor */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Post Content
                  </CardTitle>
                  <CardDescription>
                    Create your promotional message
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Message</Label>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2"
                        onClick={generateWithAI}
                        disabled={isGenerating}
                      >
                        {isGenerating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        AI Generate
                      </Button>
                    </div>
                    <Textarea
                      placeholder="Write your promotional message..."
                      value={postText}
                      onChange={(e) => setPostText(e.target.value)}
                      className="min-h-32"
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {fullPostText.length} characters
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Hashtags
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {hashtags.map((tag, i) => (
                        <Badge 
                          key={i} 
                          variant="secondary" 
                          className="cursor-pointer hover:bg-destructive/20"
                          onClick={() => setHashtags(hashtags.filter((_, idx) => idx !== i))}
                        >
                          #{tag} &times;
                        </Badge>
                      ))}
                      <Input
                        placeholder="Add hashtag..."
                        className="w-32 h-7 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const value = (e.target as HTMLInputElement).value.replace('#', '')
                            if (value && !hashtags.includes(value)) {
                              setHashtags([...hashtags, value])
                              ;(e.target as HTMLInputElement).value = ''
                            }
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Link2 className="h-4 w-4" />
                      Link URL (optional)
                    </Label>
                    <Input
                      placeholder="https://..."
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Templates */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Templates</CardTitle>
                  <CardDescription>
                    Start with a proven template
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {promoTemplates.map((template) => (
                      <Button
                        key={template.name}
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-start text-left"
                        onClick={() => applyTemplate(template)}
                      >
                        <span className="font-medium">{template.name}</span>
                        <span className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {template.template}
                        </span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Share Options */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Share2 className="h-5 w-5" />
                    Share To
                  </CardTitle>
                  <CardDescription>
                    Post to your social accounts
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {socialPlatforms.map((platform) => {
                    const Icon = platform.icon
                    const shareUrl = platform.shareUrl?.(fullPostText, linkUrl)
                    
                    return (
                      <div 
                        key={platform.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="p-2 rounded-lg"
                            style={{ backgroundColor: `${platform.color}20` }}
                          >
                            <Icon className="h-5 w-5" style={{ color: platform.color }} />
                          </div>
                          <span className="font-medium">{platform.name}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(fullPostText, platform.id)}
                          >
                            {copied === platform.id ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          {shareUrl && (
                            <Button
                              size="sm"
                              onClick={() => window.open(shareUrl, '_blank', 'width=600,height=400')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              {/* Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg bg-muted p-4 text-sm whitespace-pre-wrap">
                    {fullPostText || 'Your post will appear here...'}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="links" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Your Platform Links
              </CardTitle>
              <CardDescription>
                Quick access to your profile links for bio updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {connectedPlatformLinks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No platforms connected yet. Connect your accounts to see your links here.
                </p>
              ) : (
                connectedPlatformLinks.map((link) => (
                  <div 
                    key={link.platform}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium capitalize">{link.platform}</p>
                      <p className="text-sm text-muted-foreground">@{link.username}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded hidden sm:block">
                        {link.url}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(link.url, link.platform)}
                      >
                        {copied === link.platform ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => window.open(link.url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Linktree-style links suggestion */}
          <Card>
            <CardHeader>
              <CardTitle>Bio Link Suggestion</CardTitle>
              <CardDescription>
                Copy this formatted text for your social media bios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg bg-muted p-4 text-sm font-mono whitespace-pre-wrap">
                  {connectedPlatformLinks.map(link => 
                    `${link.platform.charAt(0).toUpperCase() + link.platform.slice(1)}: ${link.url}`
                  ).join('\n') || 'Connect your platforms to generate bio links'}
                </div>
                {connectedPlatformLinks.length > 0 && (
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => copyToClipboard(
                      connectedPlatformLinks.map(link => 
                        `${link.platform.charAt(0).toUpperCase() + link.platform.slice(1)}: ${link.url}`
                      ).join('\n'),
                      'bio'
                    )}
                  >
                    {copied === 'bio' ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy All Links
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
