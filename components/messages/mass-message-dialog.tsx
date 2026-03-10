'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Send, Loader2, Check, AlertCircle, Users, Megaphone } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ConnectedPlatform {
  platform: string
  platform_username: string
  is_connected: boolean
}

export function MassMessageDialog() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [platforms, setPlatforms] = useState<string[]>([])
  const [connectedPlatforms, setConnectedPlatforms] = useState<ConnectedPlatform[]>([])
  const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'renewing'>('all')
  const [isSending, setIsSending] = useState(false)
  const [results, setResults] = useState<{
    success: boolean
    totalSent: number
    totalFailed: number
    results: Record<string, { success: boolean; sent?: number; error?: string }>
  } | null>(null)
  
  const supabase = createClient()

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
        setPlatforms(data.map(p => p.platform))
      }
    }
    if (open) {
      loadPlatforms()
      setResults(null)
      setMessage('')
    }
  }, [open])

  const togglePlatform = (platform: string) => {
    setPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
  }

  const handleSend = async () => {
    if (!message || platforms.length === 0) return

    setIsSending(true)
    setResults(null)

    try {
      const response = await fetch('/api/messages/mass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          platforms,
          filter,
        }),
      })

      const data = await response.json()
      setResults(data)
    } catch (error) {
      setResults({
        success: false,
        totalSent: 0,
        totalFailed: 0,
        results: { error: { success: false, error: 'Failed to send' } }
      })
    } finally {
      setIsSending(false)
    }
  }

  const platformConfig: Record<string, { label: string; color: string }> = {
    onlyfans: { label: 'OnlyFans', color: '#00AFF0' },
    fansly: { label: 'Fansly', color: '#009FFF' },
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" variant="default">
          <Megaphone className="h-4 w-4" />
          Mass Message
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Send Mass Message
          </DialogTitle>
          <DialogDescription>
            Send a message to all your subscribers across platforms
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Message Input */}
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-32"
            />
            <p className="text-xs text-muted-foreground">
              {message.length} characters
            </p>
          </div>

          {/* Platform Selection */}
          <div className="space-y-2">
            <Label>Send to platforms</Label>
            {connectedPlatforms.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No platforms connected. Connect your accounts first.
              </p>
            ) : (
              <div className="space-y-2">
                {connectedPlatforms.map(platform => {
                  const config = platformConfig[platform.platform] || { 
                    label: platform.platform, 
                    color: '#888' 
                  }
                  return (
                    <div key={platform.platform} className="flex items-center space-x-3">
                      <Checkbox
                        id={`mass-${platform.platform}`}
                        checked={platforms.includes(platform.platform)}
                        onCheckedChange={() => togglePlatform(platform.platform)}
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <div 
                          className="h-3 w-3 rounded-full" 
                          style={{ backgroundColor: config.color }}
                        />
                        <Label htmlFor={`mass-${platform.platform}`} className="cursor-pointer">
                          {config.label}
                        </Label>
                        <Badge variant="outline" className="text-xs ml-auto">
                          @{platform.platform_username}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Subscriber Filter */}
          <div className="space-y-2">
            <Label>Send to</Label>
            <Select value={filter} onValueChange={(v: typeof filter) => setFilter(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    All Subscribers
                  </div>
                </SelectItem>
                <SelectItem value="active">Active Subscribers Only</SelectItem>
                <SelectItem value="expired">Expired Subscribers Only</SelectItem>
                <SelectItem value="renewing">Auto-Renewing Subscribers</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results */}
          {results && (
            <div className={`rounded-lg p-4 ${results.success ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
              <div className="flex items-center gap-2 mb-2">
                {results.success ? (
                  <Check className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
                <span className="font-medium">
                  {results.success ? 'Messages Sent!' : 'Partial Success'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Sent to {results.totalSent} subscribers
                {results.totalFailed > 0 && `, ${results.totalFailed} failed`}
              </p>
              {results.results && Object.entries(results.results).map(([platform, result]) => (
                <div key={platform} className="flex items-center gap-2 mt-2 text-sm">
                  {result.success ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className="capitalize">{platform}</span>
                  {result.sent && <span className="text-muted-foreground">({result.sent} sent)</span>}
                  {result.error && <span className="text-destructive text-xs">{result.error}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Send Button */}
          <Button
            className="w-full gap-2"
            onClick={handleSend}
            disabled={isSending || !message || platforms.length === 0}
            style={{ 
              background: platforms.length > 0 && message 
                ? 'linear-gradient(135deg, #00AFF0, #009FFF)' 
                : undefined 
            }}
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending to {platforms.length} platform(s)...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send to All ({platforms.length})
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
