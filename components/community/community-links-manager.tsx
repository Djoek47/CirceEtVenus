'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ExternalLink, Loader2, Plus, Trash2, ChevronUp, ChevronDown, Share2 } from 'lucide-react'

type CommunityLink = { id: string; label: string; url: string }

export function CommunityLinksManager() {
  const [links, setLinks] = useState<CommunityLink[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/profile/community-links')
      if (!res.ok) throw new Error('Failed to load links')
      const data = (await res.json()) as { links?: CommunityLink[] }
      setLinks(Array.isArray(data.links) ? data.links : [])
    } catch {
      setError('Could not load community links.')
      setLinks([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const persist = async (next: CommunityLink[]) => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/profile/community-links', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links: next }),
      })
      if (!res.ok) throw new Error('Save failed')
      const data = (await res.json()) as { links?: CommunityLink[] }
      setLinks(Array.isArray(data.links) ? data.links : next)
    } catch {
      setError('Could not save. Check URLs are http(s) and try again.')
    } finally {
      setSaving(false)
    }
  }

  const addLink = () => {
    const label = newLabel.trim()
    const url = newUrl.trim()
    if (!label || !url) return
    try {
      const u = new URL(url)
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return
    } catch {
      setError('Enter a valid http(s) URL.')
      return
    }
    if (links.length >= 12) {
      setError('Maximum 12 links.')
      return
    }
    const next = [...links, { id: crypto.randomUUID(), label, url }]
    setNewLabel('')
    setNewUrl('')
    void persist(next)
  }

  const removeAt = (i: number) => {
    const next = links.filter((_, idx) => idx !== i)
    void persist(next)
  }

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= links.length) return
    const next = [...links]
    ;[next[i], next[j]] = [next[j], next[i]]
    void persist(next)
  }

  if (loading) {
    return (
      <div className="flex min-h-[24vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Community links</h2>
          <p className="text-sm text-muted-foreground">
            Discord, Telegram, link-in-bio tools, or anywhere your fans find you.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/social" className="gap-2">
            <Share2 className="h-4 w-4" />
            Social only
          </Link>
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Your links</CardTitle>
          <CardDescription>Up to 12 links.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {links.length === 0 ? (
            <p className="text-sm text-muted-foreground">No links yet. Add one below.</p>
          ) : (
            <ul className="space-y-2">
              {links.map((link, i) => (
                <li
                  key={link.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/20 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{link.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{link.url}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => move(i, -1)}
                      disabled={i === 0 || saving}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => move(i, 1)}
                      disabled={i === links.length - 1 || saving}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="gap-1">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open
                      </a>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeAt(i)}
                      disabled={saving}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-3 rounded-lg border border-dashed border-border p-4">
            <p className="text-sm font-medium">Add link</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="comm-label">Label</Label>
                <Input
                  id="comm-label"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Discord"
                  maxLength={80}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="comm-url">URL</Label>
                <Input id="comm-url" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://…" />
              </div>
            </div>
            <Button type="button" onClick={addLink} disabled={saving || links.length >= 12} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
