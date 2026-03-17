'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Upload, Calendar, Image, Video, FileText, Send, Loader2, Check, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { createContent } from '@/lib/actions'
import { createClient } from '@/lib/supabase/client'

interface ConnectedPlatform {
  platform: string
  platform_username: string
  is_connected: boolean
}

export default function NewContentPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishResults, setPublishResults] = useState<Record<string, { success: boolean; error?: string }> | null>(null)
  const [platforms, setPlatforms] = useState<string[]>([])
  const [connectedPlatforms, setConnectedPlatforms] = useState<ConnectedPlatform[]>([])
  const [contentType, setContentType] = useState('image')
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const supabase = createClient()

  // Load connected platforms
  useEffect(() => {
    async function loadPlatforms() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('platform_connections')
        .select('platform, platform_username, is_connected')
        .eq('user_id', user.id)
        .eq('is_connected', true)

      if (data && data.length > 0) {
        setConnectedPlatforms(data)
        // Auto-select all connected platforms
        setPlatforms(data.map(p => p.platform))
      }
    }
    loadPlatforms()
  }, [])

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    platforms.forEach(p => formData.append('platforms', p))
    formData.set('content_type', contentType)
    try {
      await createContent(formData)
      router.push('/dashboard/content')
    } catch (error) {
      console.error('Failed to create content:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Publish immediately to selected platforms
  async function handlePublishNow() {
    if (!content || platforms.length === 0) return
    
    setIsPublishing(true)
    setPublishResults(null)
    
    try {
      const response = await fetch('/api/content/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: content,
          platforms,
          contentType: contentType as 'image' | 'video' | 'text',
        }),
      })

      const data = await response.json()
      
      if (data.results) {
        setPublishResults(data.results)
      }

      if (data.success) {
        // Wait a moment to show success, then redirect
        setTimeout(() => router.push('/dashboard/content'), 2000)
      }
    } catch (error) {
      console.error('Failed to publish:', error)
    } finally {
      setIsPublishing(false)
    }
  }

  const togglePlatform = (platform: string) => {
    setPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/content">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Create Content</h2>
          <p className="text-muted-foreground">
            Schedule and manage your content
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Content Details
              </CardTitle>
              <CardDescription>
                Fill in the content information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Title (internal reference)</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="Content title for your reference"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Post Content *</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Write your post content here... This will be published to all selected platforms."
                    className="min-h-32 bg-input"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    {content.length} characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Content Type</Label>
                  <div className="flex gap-2">
                    {[
                      { value: 'image', icon: Image, label: 'Image' },
                      { value: 'video', icon: Video, label: 'Video' },
                      { value: 'text', icon: FileText, label: 'Text' },
                    ].map(type => (
                      <Button
                        key={type.value}
                        type="button"
                        variant={contentType === type.value ? 'default' : 'outline'}
                        className="flex-1 gap-2"
                        onClick={() => setContentType(type.value)}
                      >
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Upload Media</Label>
                  <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-border bg-input/50">
                    <div className="text-center">
                      <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        Drag and drop or click to upload
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    name="tags"
                    placeholder="Enter tags separated by commas"
                    className="bg-input"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select name="status" defaultValue="draft">
                      <SelectTrigger className="bg-input">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scheduled_at">Schedule Date</Label>
                    <Input
                      id="scheduled_at"
                      name="scheduled_at"
                      type="datetime-local"
                      className="bg-input"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Link href="/dashboard/content">
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create Content'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Publish To
              </CardTitle>
              <CardDescription>
                Select platforms to post
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {connectedPlatforms.length === 0 ? (
                <div className="text-center py-4">
                  <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No platforms connected</p>
                  <Link href="/dashboard">
                    <Button variant="link" size="sm" className="mt-2">
                      Connect Platforms
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  {connectedPlatforms.map(platform => {
                    const config = {
                      onlyfans: { label: 'OnlyFans', color: '#00AFF0' },
                      fansly: { label: 'Fansly', color: '#009FFF' },
                      manyvids: { label: 'ManyVids', color: '#E91E63' },
                    }[platform.platform] || { label: platform.platform, color: '#888' }

                    return (
                      <div key={platform.platform} className="flex items-center space-x-3">
                        <Checkbox
                          id={platform.platform}
                          checked={platforms.includes(platform.platform)}
                          onCheckedChange={() => togglePlatform(platform.platform)}
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <div 
                            className="h-3 w-3 rounded-full" 
                            style={{ backgroundColor: config.color }}
                          />
                          <Label htmlFor={platform.platform} className="cursor-pointer flex-1">
                            {config.label}
                          </Label>
                          <Badge variant="outline" className="text-xs">
                            @{platform.platform_username}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </>
              )}

              {/* Publish Results */}
              {publishResults && (
                <div className="mt-4 space-y-2 border-t pt-4">
                  <p className="text-sm font-medium">Publish Results:</p>
                  {Object.entries(publishResults).map(([platform, result]) => (
                    <div key={platform} className="flex items-center gap-2 text-sm">
                      {result.success ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      )}
                      <span className="capitalize">{platform}</span>
                      {result.error && (
                        <span className="text-xs text-destructive">{result.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Publish Now Button */}
              <Button
                className="w-full mt-4 gap-2"
                onClick={handlePublishNow}
                disabled={isPublishing || !content || platforms.length === 0}
                style={{ 
                  background: platforms.length > 0 
                    ? 'linear-gradient(135deg, #00AFF0, #009FFF)' 
                    : undefined 
                }}
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Publish Now ({platforms.length})
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
