'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Upload, Calendar, Image, Video, FileText } from 'lucide-react'
import Link from 'next/link'
import { createContent } from '@/lib/actions'

export default function NewContentPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [platforms, setPlatforms] = useState<string[]>(['onlyfans'])
  const [contentType, setContentType] = useState('image')

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
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="Content title"
                    required
                    className="bg-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Describe your content..."
                    className="min-h-24 bg-input"
                  />
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
                <Calendar className="h-5 w-5" />
                Platforms
              </CardTitle>
              <CardDescription>
                Select where to publish
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { value: 'onlyfans', label: 'OnlyFans', color: 'bg-[#00AFF0]' },
                { value: 'fansly', label: 'Fansly', color: 'bg-[#009FFF]' },
                { value: 'mym', label: 'MYM', color: 'bg-[#FF4D67]' },
              ].map(platform => (
                <div key={platform.value} className="flex items-center space-x-3">
                  <Checkbox
                    id={platform.value}
                    checked={platforms.includes(platform.value)}
                    onCheckedChange={() => togglePlatform(platform.value)}
                  />
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${platform.color}`} />
                    <Label htmlFor={platform.value} className="cursor-pointer">
                      {platform.label}
                    </Label>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
