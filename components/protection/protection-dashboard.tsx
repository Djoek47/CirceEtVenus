'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { LeakAlert } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Loader2, ExternalLink, Upload, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  activeAlerts: LeakAlert[]
}

export function ProtectionDashboard({ activeAlerts }: Props) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [scanLoading, setScanLoading] = useState(false)
  const [manualUrl, setManualUrl] = useState('')
  const [manualLoading, setManualLoading] = useState(false)

  const [dmcaOpen, setDmcaOpen] = useState(false)
  const [dmcaLoading, setDmcaLoading] = useState(false)
  const [claimId, setClaimId] = useState<string | null>(null)
  const [noticeText, setNoticeText] = useState<string>('')
  const [selectedAlert, setSelectedAlert] = useState<LeakAlert | null>(null)
  const [proofUploading, setProofUploading] = useState(false)
  const [proofPaths, setProofPaths] = useState<string[]>([])

  const severityColors: Record<string, string> = {
    critical: 'bg-destructive/20 text-destructive border-destructive/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  }

  const runScan = async () => {
    setScanLoading(true)
    try {
      await fetch('/api/leaks/scan', { method: 'POST' })
      router.refresh()
    } finally {
      setScanLoading(false)
    }
  }

  const reportManual = async () => {
    const url = manualUrl.trim()
    if (!url) return
    setManualLoading(true)
    try {
      await fetch('/api/leaks/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: [url] }),
      })
      setManualUrl('')
      router.refresh()
    } finally {
      setManualLoading(false)
    }
  }

  const startDmcaFromAlert = async (alert: LeakAlert) => {
    setSelectedAlert(alert)
    setDmcaOpen(true)
    setDmcaLoading(true)
    setClaimId(null)
    setNoticeText('')
    setProofPaths([])
    try {
      const res = await fetch('/api/dmca/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leakAlertId: alert.id }),
      })
      const data = await res.json()
      if (res.ok) {
        setClaimId(data.claimId)
        setNoticeText(data.notice || '')
      }
    } finally {
      setDmcaLoading(false)
    }
  }

  const uploadProof = async (file: File) => {
    if (!claimId) return
    setProofUploading(true)
    try {
      const res = await fetch('/api/dmca/proof/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId, filename: file.name, contentType: file.type }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to get upload URL')

      const { path, token } = data as { path: string; token: string; signedUrl: string }
      const { error } = await supabase.storage
        .from('dmca-proofs')
        .uploadToSignedUrl(path, token, file, { contentType: file.type || 'application/octet-stream' })
      if (error) throw new Error(error.message)

      // Attach proof path to claim
      await fetch(`/api/dmca/claim/${claimId}/proofs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proofPaths: [path] }),
      })
      setProofPaths((prev) => Array.from(new Set([...prev, path])))
    } finally {
      setProofUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex gap-2">
          <Button className="gap-2 bg-circe hover:bg-circe/90" onClick={runScan} disabled={scanLoading}>
            {scanLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Invoke Scan
          </Button>
        </div>
        <div className="w-full sm:max-w-md">
          <Label htmlFor="manual-url" className="text-xs text-muted-foreground">
            Bring your own link
          </Label>
          <div className="mt-1 flex gap-2">
            <Input
              id="manual-url"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="Paste infringing URL…"
            />
            <Button variant="outline" onClick={reportManual} disabled={manualLoading || !manualUrl.trim()}>
              {manualLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Report
            </Button>
          </div>
        </div>
      </div>

      {/* Active Alerts list (actionable) */}
      <div className="space-y-3">
        {activeAlerts.map((alert) => (
          <div
            key={alert.id}
            className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/30 p-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn('text-xs capitalize', severityColors[alert.severity] || 'bg-muted text-muted-foreground')}
                >
                  {alert.severity || 'unknown'}
                </Badge>
                <Badge variant="outline" className="text-xs capitalize">
                  {alert.status.replace('_', ' ')}
                </Badge>
                <span className="text-xs text-muted-foreground">{alert.source_platform}</span>
              </div>
              <div className="text-sm break-all">{alert.source_url}</div>
              {alert.notes ? (
                <div className="text-xs text-muted-foreground line-clamp-2">{alert.notes}</div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <a href={alert.source_url} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View
                </a>
              </Button>
              <Button size="sm" onClick={() => startDmcaFromAlert(alert)}>
                Send DMCA
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* DMCA modal */}
      <Dialog open={dmcaOpen} onOpenChange={setDmcaOpen}>
        <DialogTrigger asChild>
          <span />
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>DMCA Takedown Notice</DialogTitle>
          </DialogHeader>

          {dmcaLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !claimId ? (
            <div className="text-sm text-muted-foreground">Unable to generate claim.</div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs whitespace-pre-wrap">
                {noticeText || 'Notice generated.'}
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Proof of ownership (required)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) uploadProof(f)
                      e.currentTarget.value = ''
                    }}
                    disabled={proofUploading}
                  />
                  <Button variant="outline" disabled>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </Button>
                </div>
                {proofPaths.length > 0 ? (
                  <div className="text-xs text-muted-foreground">
                    {proofPaths.length} proof file(s) attached.
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Upload at least 1 proof file before downloading.
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  asChild
                  disabled={proofPaths.length === 0}
                >
                  <a href={`/api/dmca/claim/${claimId}/download`}>
                    <FileText className="mr-2 h-4 w-4" />
                    Download DMCA Notice
                  </a>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDmcaOpen(false)
                    setSelectedAlert(null)
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

