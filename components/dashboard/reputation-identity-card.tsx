'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, UserCircle } from 'lucide-react'

type Props = {
  initialManualHandles: string[]
  initialDisplayName: string | null
  initialOnlyfans: string
  initialMym: string
}

export function ReputationIdentityCard({
  initialManualHandles,
  initialDisplayName,
  initialOnlyfans,
  initialMym,
}: Props) {
  const router = useRouter()
  const [handles, setHandles] = useState(initialManualHandles.join(', '))
  const [displayName, setDisplayName] = useState(initialDisplayName ?? '')
  const [onlyfans, setOnlyfans] = useState(initialOnlyfans)
  const [mym, setMym] = useState(initialMym)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setSaving(true)
    setError(null)
    const list = handles
      .split(/[,\n]+/)
      .map((s) => s.trim().replace(/^@/, ''))
      .filter(Boolean)
    const platform: Record<string, string> = {}
    if (onlyfans.trim()) platform.onlyfans = onlyfans.trim().replace(/^@/, '')
    if (mym.trim()) platform.mym = mym.trim().replace(/^@/, '')

    try {
      const res = await fetch('/api/social/reputation-identity', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reputation_manual_handles: list,
          reputation_display_name: displayName.trim() || null,
          reputation_platform_handles: Object.keys(platform).length ? platform : null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not save')
        return
      }
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserCircle className="h-4 w-4 text-muted-foreground" />
          Reputation search identity
        </CardTitle>
        <CardDescription>
          Add @handles and optional names for indexed web search—OAuth is not required. Same handles power{' '}
          <span className="text-foreground">Refresh Vision</span> and AI briefing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="space-y-2">
          <Label htmlFor="rep-handles">Search handles (comma-separated)</Label>
          <Input
            id="rep-handles"
            placeholder="e.g. sophierain, yourbrand"
            value={handles}
            onChange={(e) => setHandles(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rep-display">Display or real name (optional)</Label>
          <Input
            id="rep-display"
            placeholder="Stage or legal name for broader news queries"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="rep-of">OnlyFans username (optional)</Label>
            <Input
              id="rep-of"
              placeholder="without @"
              value={onlyfans}
              onChange={(e) => setOnlyfans(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rep-mym">MYM / similar (optional)</Label>
            <Input
              id="rep-mym"
              placeholder="without @"
              value={mym}
              onChange={(e) => setMym(e.target.value)}
            />
          </div>
        </div>
        <Button type="button" size="sm" onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save identity
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={async () => {
            setHandles('')
            setDisplayName('')
            setOnlyfans('')
            setMym('')
            setSaving(true)
            setError(null)
            try {
              const res = await fetch('/api/social/reputation-identity', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  reputation_manual_handles: [],
                  reputation_display_name: null,
                  reputation_platform_handles: null,
                }),
              })
              const data = await res.json().catch(() => ({}))
              if (!res.ok) {
                setError(typeof data.error === 'string' ? data.error : 'Could not clear identities')
                return
              }
              if (typeof window !== 'undefined') {
                window.localStorage.removeItem('mentions_selected_handles')
              }
              router.refresh()
            } catch {
              setError('Network error')
            } finally {
              setSaving(false)
            }
          }}
          disabled={saving}
        >
          Delete saved identities
        </Button>
      </CardContent>
    </Card>
  )
}
