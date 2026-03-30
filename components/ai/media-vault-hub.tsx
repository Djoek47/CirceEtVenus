'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, ImageIcon, Link2, Save, Sparkles, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type VaultContentRow = {
  id: string
  title: string
  description: string | null
  content_type: string
  status: string
  thumbnail_url: string | null
  file_url: string | null
  sales_notes: string | null
  teaser_tags: string[] | null
  spoiler_level: string | null
  source_platform: string | null
  external_post_id: string | null
  external_preview_url: string | null
  scheduled_at: string | null
  updated_at?: string | null
}

type OfPost = {
  id: string
  text: string
  createdAt: string
  media: { id: string; type: string; url: string }[]
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error('read failed'))
    r.readAsDataURL(file)
  })
}

export function MediaVaultHub() {
  const supabase = createClient()
  const [rows, setRows] = useState<VaultContentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [ofPosts, setOfPosts] = useState<OfPost[]>([])
  const [ofLoading, setOfLoading] = useState(false)
  const [ofError, setOfError] = useState<string | null>(null)
  const [selected, setSelected] = useState<VaultContentRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [linking, setLinking] = useState<string | null>(null)

  const [draftTitle, setDraftTitle] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [draftSales, setDraftSales] = useState('')
  const [draftTags, setDraftTags] = useState('')
  const [draftSpoiler, setDraftSpoiler] = useState('none')

  const [touchOp, setTouchOp] = useState<'blur' | 'lighting' | 'emoji'>('blur')
  const [touchFile, setTouchFile] = useState<File | null>(null)
  const [touchBlur, setTouchBlur] = useState('10')
  const [touchBright, setTouchBright] = useState('1.08')
  const [touchEmoji, setTouchEmoji] = useState('✨')
  const [touchPreview, setTouchPreview] = useState<string | null>(null)
  const [touchBusy, setTouchBusy] = useState(false)

  const loadVault = useCallback(async () => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setRows([])
        return
      }
      const { data, error } = await supabase
        .from('content')
        .select(
          'id, title, description, content_type, status, thumbnail_url, file_url, sales_notes, teaser_tags, spoiler_level, source_platform, external_post_id, external_preview_url, scheduled_at, updated_at',
        )
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) {
        const { data: fallback } = await supabase
          .from('content')
          .select(
            'id, title, description, content_type, status, thumbnail_url, file_url, scheduled_at, updated_at',
          )
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
        setRows((fallback || []) as VaultContentRow[])
        return
      }
      setRows((data || []) as VaultContentRow[])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    void loadVault()
  }, [loadVault])

  const loadOfPosts = async () => {
    setOfLoading(true)
    setOfError(null)
    try {
      const res = await fetch('/api/onlyfans/vault-posts?limit=50')
      const json = await res.json()
      if (!res.ok) {
        setOfError(json.error || 'Failed to load')
        setOfPosts([])
        return
      }
      setOfPosts(Array.isArray(json.posts) ? json.posts : [])
    } catch {
      setOfError('Network error')
      setOfPosts([])
    } finally {
      setOfLoading(false)
    }
  }

  useEffect(() => {
    void loadOfPosts()
  }, [])

  const openRow = (r: VaultContentRow) => {
    setSelected(r)
    setDraftTitle(r.title)
    setDraftDescription(r.description || '')
    setDraftSales(r.sales_notes || '')
    setDraftTags((r.teaser_tags || []).join(', '))
    setDraftSpoiler(r.spoiler_level || 'none')
    setTouchPreview(null)
    setTouchFile(null)
  }

  const saveRow = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const teaser_tags = draftTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
      const res = await fetch(`/api/content/vault/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draftTitle,
          description: draftDescription || null,
          sales_notes: draftSales || null,
          teaser_tags,
          spoiler_level: draftSpoiler,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        console.warn(json.error || res.statusText)
        return
      }
      await loadVault()
      if (json.content) {
        setSelected(json.content as VaultContentRow)
      }
    } finally {
      setSaving(false)
    }
  }

  const linkOfPost = async (post: OfPost) => {
    const firstImg = post.media?.find((m) => m.type?.toLowerCase().includes('photo') || m.url)
    const preview = firstImg?.url || null
    setLinking(post.id)
    try {
      const res = await fetch('/api/content/vault/import-onlyfans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          text: post.text,
          previewUrl: preview,
          mediaType: firstImg?.type || 'photo',
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        console.warn(json.error)
        return
      }
      await loadVault()
    } finally {
      setLinking(null)
    }
  }

  const runTouchUp = async () => {
    setTouchBusy(true)
    setTouchPreview(null)
    try {
      let imageBase64: string
      if (touchFile) {
        imageBase64 = await fileToDataUrl(touchFile)
      } else {
        const url = selected?.file_url || selected?.thumbnail_url || selected?.external_preview_url
        if (!url) return
        const r = await fetch(url)
        const blob = await r.blob()
        imageBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
      }

      if (!/^data:image\//i.test(imageBase64)) {
        return
      }

      let body: Record<string, unknown> = { imageBase64, operation: touchOp }
      if (touchOp === 'blur') body.sigma = Number.parseFloat(touchBlur) || 10
      if (touchOp === 'lighting') body.brightness = Number.parseFloat(touchBright) || 1.08
      if (touchOp === 'emoji') {
        body.emoji = touchEmoji.slice(0, 8)
        body.xPercent = 50
        body.yPercent = 18
        body.sizePercent = 14
      }

      const res = await fetch('/api/ai/media-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        console.warn(json.error || 'Edit failed')
        return
      }
      setTouchPreview(typeof json.imageBase64 === 'string' ? json.imageBase64 : null)
    } catch (e) {
      console.warn(e)
    } finally {
      setTouchBusy(false)
    }
  }

  const thumbFor = (r: VaultContentRow) =>
    r.thumbnail_url || r.file_url || r.external_preview_url || null

  const isPhoto = (r: VaultContentRow) =>
    r.content_type === 'photo' || (r.content_type !== 'video' && !r.content_type?.includes('video'))

  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Media &amp; Vault
          </CardTitle>
          <CardDescription>
            Creatix library plus OnlyFans posts. Add <strong>sales notes</strong> and <strong>teaser tags</strong> so
            Divine Manager can recommend the right PPVs in DMs—same data as vault tools.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="creatix" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="creatix">Creatix vault</TabsTrigger>
          <TabsTrigger value="onlyfans" onClick={() => ofPosts.length === 0 && void loadOfPosts()}>
            OnlyFans feed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="creatix" className="mt-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No vault items yet. Link OnlyFans posts or add content from{' '}
                <Link href="/dashboard/content" className="text-primary underline">
                  Content
                </Link>
                .
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => openRow(r)}
                  className={cn(
                    'flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition hover:border-primary/40',
                  )}
                >
                  <div className="relative aspect-video bg-muted">
                    {thumbFor(r) ? (
                      <Image
                        src={thumbFor(r)!}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageIcon className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                    {r.source_platform === 'onlyfans' && (
                      <Badge className="absolute right-2 top-2 text-[10px]" variant="secondary">
                        OF
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1 p-3">
                    <p className="line-clamp-2 text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {r.content_type} · {r.status}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="onlyfans" className="mt-4 space-y-4">
          {ofLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : ofError ? (
            <p className="text-sm text-muted-foreground">{ofError}</p>
          ) : (
            <ScrollArea className="h-[min(60vh,520px)] pr-3">
              <div className="space-y-3">
                {ofPosts.map((p) => {
                  const prev = p.media?.[0]?.url
                  return (
                    <Card key={p.id}>
                      <CardContent className="flex gap-3 p-3">
                        <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-md bg-muted">
                          {prev ? (
                            <Image src={prev} alt="" fill className="object-cover" unoptimized />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                              Text
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm">{p.text || '(no caption)'}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(p.createdAt).toLocaleDateString()}
                          </p>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="mt-2 gap-1"
                            disabled={linking === p.id}
                            onClick={() => void linkOfPost(p)}
                          >
                            {linking === p.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Link2 className="h-3 w-3" />
                            )}
                            Add to vault
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Describe for Divine</SheetTitle>
            <SheetDescription>
              Private metadata for DM and PPV recommendations—not shown to fans.
            </SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="mt-4 flex flex-1 flex-col gap-4">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                {thumbFor(selected) ? (
                  <Image src={thumbFor(selected)!} alt="" fill className="object-cover" unoptimized />
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={draftDescription} onChange={(e) => setDraftDescription(e.target.value)} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Sales notes (for Divine)</Label>
                <Textarea
                  value={draftSales}
                  onChange={(e) => setDraftSales(e.target.value)}
                  placeholder="Hook, buyer, angle, boundaries…"
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Teaser tags (comma-separated)</Label>
                <Input value={draftTags} onChange={(e) => setDraftTags(e.target.value)} placeholder="lingerie, gym, cosplay" />
              </div>
              <div className="space-y-2">
                <Label>Spoiler level</Label>
                <Select value={draftSpoiler} onValueChange={setDraftSpoiler}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">none</SelectItem>
                    <SelectItem value="mild">mild</SelectItem>
                    <SelectItem value="explicit">explicit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => void saveRow()} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save metadata
              </Button>

              {isPhoto(selected) && (
                <div className="space-y-3 border-t border-border pt-4">
                  <div className="flex items-center gap-2">
                    <Wand2 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Safe photo touch-up</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Photos only: blur, lighting, or emoji overlay. Upload a file if the preview cannot load (CDN
                    blocking).
                  </p>
                  <Select value={touchOp} onValueChange={(v) => setTouchOp(v as typeof touchOp)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blur">Blur</SelectItem>
                      <SelectItem value="lighting">Lighting</SelectItem>
                      <SelectItem value="emoji">Emoji overlay</SelectItem>
                    </SelectContent>
                  </Select>
                  {touchOp === 'blur' && (
                    <Input
                      type="number"
                      min={0.5}
                      max={35}
                      step={0.5}
                      value={touchBlur}
                      onChange={(e) => setTouchBlur(e.target.value)}
                    />
                  )}
                  {touchOp === 'lighting' && (
                    <Input
                      type="number"
                      min={0.65}
                      max={1.35}
                      step={0.02}
                      value={touchBright}
                      onChange={(e) => setTouchBright(e.target.value)}
                    />
                  )}
                  {touchOp === 'emoji' && (
                    <Input value={touchEmoji} onChange={(e) => setTouchEmoji(e.target.value)} maxLength={8} />
                  )}
                  <Input type="file" accept="image/png,image/jpeg" onChange={(e) => setTouchFile(e.target.files?.[0] || null)} />
                  <Button type="button" variant="secondary" disabled={touchBusy} onClick={() => void runTouchUp()}>
                    {touchBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Run touch-up'}
                  </Button>
                  {touchPreview && (
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={touchPreview} alt="Result" className="h-full w-full object-contain" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
