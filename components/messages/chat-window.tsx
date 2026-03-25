'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Send,
  Paperclip,
  DollarSign,
  MoreVertical,
  User,
  Crown,
  Loader2,
  RefreshCw,
  Sparkles,
  Moon,
  Sun,
  Heart,
} from 'lucide-react'
import { VoiceInputButton } from '@/components/voice-input-button'
import { useDivinePanel } from '@/components/divine/divine-panel-context'
import { useVoiceSession } from '@/components/divine/voice-session-context'
import { cn } from '@/lib/utils'
import { stripHtml } from '@/lib/html-utils'
import type { NormalizedChatMessage } from '@/lib/ai/message-suggestions'
import { createClient } from '@/lib/supabase/client'
import { isBoundaryNiche, NICHE_LABELS } from '@/lib/niches'
import { proxyImageUrl } from '@/lib/proxy-image-url'

interface OnlyFansConversation {
  user: {
    id: string
    username: string
    name: string
    avatar: string
  }
  lastMessage: {
    id: string
    text: string
    createdAt: string
    isRead: boolean
  }
  unreadCount: number
  platform: 'onlyfans' | 'fansly'
  chatId?: string
}

interface OnlyFansMedia {
  id: number | string
  type: 'photo' | 'video'
  canView: boolean
  files?: {
    full?: { url: string | null; width?: number; height?: number }
    thumb?: { url: string | null }
    preview?: { url: string | null }
    squarePreview?: { url: string | null }
  }
  // Legacy format fallback
  url?: string
  preview?: string
}

interface OnlyFansMessage {
  id: string | number
  fromUser: {
    id: string | number
    username?: string
    name?: string
    avatar?: string
  }
  text: string
  createdAt: string
  isRead?: boolean
  isOpened?: boolean
  isSentByMe?: boolean
  media?: OnlyFansMedia[]
  previews?: { url: string }[]
  price?: number | null
  isPaid?: boolean
  isFree?: boolean
  mediaCount?: number
}

interface ChatWindowProps {
  conversation: OnlyFansConversation | null
  userId: string
  onMessageSent?: () => void
}

export function ChatWindow({ conversation, onMessageSent }: ChatWindowProps) {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<OnlyFansMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [suggestionsLoading, setSuggestionsLoading] = useState<'scan' | 'circe' | 'venus' | 'flirt' | null>(null)
  const [scanInsights, setScanInsights] = useState<{
    insights: string[]
    riskFlags: string[]
    suggestedAngles: string[]
  } | null>(null)
  const [circeSuggestions, setCirceSuggestions] = useState<string[] | null>(null)
  const [venusSuggestions, setVenusSuggestions] = useState<string[] | null>(null)
  const [flirtSuggestions, setFlirtSuggestions] = useState<string[] | null>(null)
  const [ppvPrice, setPpvPrice] = useState<string>('')
  const [attachedMediaIds, setAttachedMediaIds] = useState<string[]>([])
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const chatFileInputRef = useRef<HTMLInputElement>(null)
  const [activePanel, setActivePanel] = useState<'circe' | 'venus' | 'flirt' | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const supabase = createClient()
  const [niches, setNiches] = useState<string[]>([])
  const [boundaries, setBoundaries] = useState<string[]>([])
  const [flirtLevel, setFlirtLevel] = useState<number>(2)
  const [flirtKeywords, setFlirtKeywords] = useState<string>('')
  const [creatorPronouns, setCreatorPronouns] = useState<string | null>(null)
  const [creatorGenderIdentity, setCreatorGenderIdentity] = useState<string | null>(null)
  const divinePanel = useDivinePanel()
  const voiceSession = useVoiceSession()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const isNearBottom = () => {
    const el = messagesContainerRef.current
    if (!el) return true
    const thresholdPx = 120
    return el.scrollHeight - el.scrollTop - el.clientHeight < thresholdPx
  }

  const normalizeAndSortMessages = (list: OnlyFansMessage[]) => {
    const byId = new Map<string, OnlyFansMessage>()
    for (const m of list) {
      const key = String(m.id)
      // Prefer the newest version if duplicates exist (e.g., read flags/media)
      byId.set(key, m)
    }
    return Array.from(byId.values()).sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
      if (ta !== tb) return ta - tb // old -> new
      // Stable tie-breaker
      return String(a.id).localeCompare(String(b.id))
    })
  }

  // Load creator niches/boundaries and identity for the active platform (stable deps to avoid infinite loop)
  const conversationPlatform = conversation?.platform
  const conversationUserId = conversation?.user?.id
  useEffect(() => {
    const loadNiches = async () => {
      if (!conversationPlatform) {
        setNiches([])
        setBoundaries([])
        return
      }
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
          .from('platform_connections')
          .select('platform,niches')
          .eq('user_id', user.id)
          .eq('platform', conversationPlatform)
          .eq('is_connected', true)
          .maybeSingle()
        const tags = ((data as any)?.niches || []) as string[]
        setNiches(tags)
        setBoundaries(tags.filter((n) => isBoundaryNiche(n)))

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()
        if (profile) {
          const basePronouns = (profile as any).pronouns_custom || (profile as any).pronouns || null
          setCreatorPronouns(basePronouns)
          setCreatorGenderIdentity(((profile as any).gender_identity as string) || null)
        }
      } catch {
        // ignore niche loading errors
      }
    }
    loadNiches()
  }, [conversationPlatform, conversationUserId, supabase])

  const buildNormalizedMessages = (): NormalizedChatMessage[] => {
    return messages.slice(-30).map((m) => ({
      from: m.fromUser.id === conversation?.user.id ? 'fan' : 'creator',
      text: stripHtml(m.text || ''),
      createdAt: m.createdAt,
    }))
  }

  // When a conversation becomes active, automatically focus that fan for Divine + voice (primitives-only deps to avoid infinite loop when context updates).
  const focusedFanId = conversation?.user?.id
  const focusedFanUsername = conversation?.user?.username
  const focusedFanName = conversation?.user?.name
  useEffect(() => {
    if (focusedFanId == null || !divinePanel) return
    const fan = {
      id: String(focusedFanId),
      username: focusedFanUsername ?? undefined,
      name: focusedFanName ?? undefined,
    }
    divinePanel.setFocusedFan(fan)
    voiceSession?.setFocusedFanForVoice(fan)
    // Intentionally omit divinePanel/voiceSession from deps: their refs change when we call setFocusedFan, which would retrigger this effect and cause "Maximum update depth exceeded" (React #185).
  }, [focusedFanId, focusedFanUsername, focusedFanName])

  const callSuggestionApi = async (mode: 'scan' | 'circe' | 'venus' | 'flirt') => {
    if (!conversation) return
    setError(null)
    setSuggestionsLoading(mode)

    try {
      const body: any = {
        mode,
        platform: conversation.platform,
        fan: {
          id: conversation.user.id,
          username: conversation.user.username,
          name: conversation.user.name,
        },
        messages: buildNormalizedMessages(),
        niches,
        boundaries,
      }

      if (mode === 'flirt') {
        body.flirtControls = {
          explicitnessLevel: flirtLevel,
          inspirationKeywords: flirtKeywords,
        }
      }

      if (creatorPronouns) {
        body.creatorPronouns = creatorPronouns
      }
      if (creatorGenderIdentity) {
        body.creatorGenderIdentity = creatorGenderIdentity
      }

      const res = await fetch('/api/ai/message-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to generate suggestions')
      }

      if (mode === 'scan') {
        setScanInsights(
          data.insights || {
            insights: [],
            riskFlags: [],
            suggestedAngles: [],
          }
        )
      } else {
        const texts = (data.suggestions || []).map((s: any) => String(s.text || '')).filter(Boolean)
        if (mode === 'circe') {
          setCirceSuggestions(texts.length ? texts : null)
          setActivePanel('circe')
        } else if (mode === 'venus') {
          setVenusSuggestions(texts.length ? texts : null)
          setActivePanel('venus')
        } else if (mode === 'flirt') {
          setFlirtSuggestions(texts.length ? texts : null)
          setActivePanel('flirt')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions')
    } finally {
      setSuggestionsLoading(null)
    }
  }

  // Load messages when conversation changes
  useEffect(() => {
    if (!conversation) {
      setMessages([])
      return
    }

    const loadMessages = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const res = await fetch(`/api/onlyfans/messages/${conversation.user.id}`)
        const data = await res.json()
        
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load messages')
        }
        
        setMessages(normalizeAndSortMessages(data.messages || []))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load messages')
      } finally {
        setLoading(false)
      }
    }

    loadMessages()
  }, [conversation])

  // Scroll to bottom when messages change
  useEffect(() => {
    // Only auto-scroll if the user is already near the bottom (prevents jumpiness while reading history)
    if (isNearBottom()) scrollToBottom()
  }, [messages])

  // Poll for new messages when a conversation is open
  useEffect(() => {
    if (!conversation) return

    const poll = async () => {
      if (!conversation) return
      setIsPolling(true)
      try {
        const res = await fetch(`/api/onlyfans/messages/${conversation.user.id}?limit=50`)
        const data = await res.json()
        if (res.ok && data?.messages) {
          setMessages((prev) => normalizeAndSortMessages([...prev, ...(data.messages || [])]))
        }
      } catch {
        // silent
      } finally {
        setIsPolling(false)
      }
    }

    // Immediate poll then interval
    poll()
    pollIntervalRef.current = setInterval(poll, 6000)
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [conversation?.user?.id])

  const handleChatFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length || conversation?.platform !== 'onlyfans') return
    setUploadingMedia(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData()
        formData.append('file', files[i])
        const res = await fetch('/api/onlyfans/media/upload', { method: 'POST', body: formData })
        if (!res.ok) throw new Error('Upload failed')
        const data = (await res.json()) as { id: string }
        if (data.id) setAttachedMediaIds((prev) => [...prev, data.id])
      }
    } catch {
      setError('Failed to upload media')
    } finally {
      setUploadingMedia(false)
      e.target.value = ''
    }
  }, [conversation?.platform])

  const handleSendMessage = async () => {
    if (!message.trim() || !conversation || sending) return
    
    setSending(true)
    const messageText = message
    setMessage('')
    const mediaIdsToSend = [...attachedMediaIds]
    const priceToSend = ppvPrice.trim() ? parseFloat(ppvPrice) : undefined
    setAttachedMediaIds([])
    setPpvPrice('')
    
    try {
      const body: { text: string; mediaIds?: string[]; price?: number } = { text: messageText }
      if (mediaIdsToSend.length > 0) body.mediaIds = mediaIdsToSend
      if (priceToSend != null && !Number.isNaN(priceToSend) && priceToSend >= 0) body.price = priceToSend

      const res = await fetch(`/api/onlyfans/messages/${conversation.user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message')
      }
      
      if (data.message) {
        setMessages(prev => normalizeAndSortMessages([...prev, data.message]))
        setTimeout(() => scrollToBottom(), 0)
      }
      onMessageSent?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
      setMessage(messageText)
      setAttachedMediaIds(mediaIdsToSend)
      if (priceToSend != null) setPpvPrice(String(priceToSend))
    } finally {
      setSending(false)
    }
  }

  if (!conversation) {
    return (
      <Card className="flex min-h-0 flex-1 items-center justify-center border-border bg-card">
        <div className="flex flex-col items-center text-center text-muted-foreground">
          <svg className="mb-4 h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p>Select a conversation to start messaging</p>
        </div>
      </Card>
    )
  }

  const fan = conversation.user

  return (
    <Card className="flex min-h-0 flex-1 flex-col border-border bg-card">
      {/* Chat Header */}
      <CardHeader className="flex flex-row items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-border">
            <AvatarImage src={proxyImageUrl(fan.avatar) || fan.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {fan.name?.[0]?.toUpperCase() || fan.username?.[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {fan.name || fan.username || 'Unknown'}
              </span>
              {/* Platform badge */}
              <span className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                conversation.platform === 'onlyfans' 
                  ? 'bg-sky-500/10 text-sky-500' 
                  : 'bg-blue-500/10 text-blue-500'
              )}>
                <img 
                  src={conversation.platform === 'onlyfans' ? '/onlyfans-logo.png' : '/fansly-logo.png'}
                  alt={conversation.platform}
                  className="h-3 w-3"
                />
                {conversation.platform === 'onlyfans' ? 'OnlyFans' : 'Fansly'}
              </span>
              {divinePanel?.focusedFan &&
                String(divinePanel.focusedFan.id) === String(conversation.user.id) && (
                  <span className="inline-flex items-center rounded-full border border-primary/40 bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary">
                    Divine focused here
                  </span>
                )}
            </div>
            <span className="text-xs text-muted-foreground">@{fan.username}</span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {divinePanel && (
              <DropdownMenuItem
                onClick={() => {
                  const fan = {
                    id: String(conversation.user.id),
                    username: conversation.user.username,
                    name: conversation.user.name,
                  }
                  divinePanel.setFocusedFan(fan)
                  voiceSession?.setFocusedFanForVoice(fan)
                  divinePanel.setPanelCollapsed(false)
                  divinePanel.setPanelOpen(true)
                }}
              >
                <Crown className="mr-2 h-4 w-4" />
                Focus for Divine
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <a href="/dashboard/divine-manager" className="flex items-center">
                <Crown className="mr-2 h-4 w-4" />
                Open Divine Manager
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              View Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setLoading(true)
              fetch(`/api/onlyfans/messages/${conversation.user.id}`)
                .then(res => res.json())
                .then(data => setMessages(data.messages || []))
                .finally(() => setLoading(false))
            }}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Messages
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      {/* Messages Area */}
      <CardContent ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => {
                setError(null)
                setLoading(true)
                fetch(`/api/onlyfans/messages/${conversation.user.id}`)
                  .then(res => res.json())
                  .then(data => setMessages(normalizeAndSortMessages(data.messages || [])))
                  .catch(e => setError(e.message))
                  .finally(() => setLoading(false))
              }}
            >
              Try Again
            </Button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground">Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isCreator = msg.fromUser.id !== conversation.user.id
              return (
                <div
                  key={msg.id}
                  className={cn(
                    'flex',
                    isCreator ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[70%] rounded-2xl px-4 py-2',
                      isCreator
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    )}
                  >
                    {msg.media && msg.media.length > 0 && (
                      <div className="mb-2 space-y-2">
                        {msg.media.map((m) => {
                          // Get the best available URL from the OnlyFans API response and proxy it
                          const rawImageUrl = m.files?.thumb?.url || m.files?.squarePreview?.url || m.files?.preview?.url || m.files?.full?.url || m.preview || m.url
                          const rawVideoUrl = m.files?.full?.url || m.url
                          const rawPosterUrl = m.files?.thumb?.url || m.files?.preview?.url || m.preview
                          
                          // Proxy the URLs to avoid CORS/403 issues
                          const imageUrl = proxyImageUrl(rawImageUrl)
                          const videoUrl = proxyImageUrl(rawVideoUrl)
                          const posterUrl = proxyImageUrl(rawPosterUrl)
                          
                          // Check if media can be viewed
                          if (!m.canView && m.canView !== undefined) {
                            return (
                              <div key={m.id} className="relative rounded-lg bg-muted/50 p-4 text-center">
                                <p className="text-sm text-muted-foreground">Locked media</p>
                              </div>
                            )
                          }
                          
                          return (
                            <div key={m.id} className="relative">
                              {m.type === 'photo' ? (
                                imageUrl ? (
                                  <img 
                                    src={imageUrl} 
                                    alt="Media" 
                                    className="rounded-lg max-w-full"
                                    onError={(e) => {
                                      // Hide broken images
                                      (e.target as HTMLImageElement).style.display = 'none'
                                    }}
                                  />
                                ) : (
                                  <div className="rounded-lg bg-muted/50 p-4 text-center">
                                    <p className="text-sm text-muted-foreground">Image unavailable</p>
                                  </div>
                                )
                              ) : (
                                videoUrl ? (
                                  <video 
                                    src={videoUrl} 
                                    poster={posterUrl || undefined}
                                    controls 
                                    className="rounded-lg max-w-full"
                                  />
                                ) : (
                                  <div className="rounded-lg bg-muted/50 p-4 text-center">
                                    <p className="text-sm text-muted-foreground">Video unavailable</p>
                                  </div>
                                )
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {/* Show preview images if media array is empty but previews exist */}
                    {(!msg.media || msg.media.length === 0) && msg.previews && msg.previews.length > 0 && (
                      <div className="mb-2 space-y-2">
                        {msg.previews.map((p, idx) => (
                          <img 
                            key={idx}
                            src={proxyImageUrl(p.url) || p.url} 
                            alt="Preview" 
                            className="rounded-lg max-w-full"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        ))}
                      </div>
                    )}
                    {msg.text && <p className="text-sm whitespace-pre-wrap">{stripHtml(msg.text)}</p>}
                    {msg.price && !msg.isPaid && (
                      <Badge className="mt-2 bg-chart-4/20 text-chart-4">
                        <DollarSign className="mr-1 h-3 w-3" />
                        PPV ${msg.price}
                      </Badge>
                    )}
                    <p
                      className={cn(
                        'mt-1 text-xs',
                        isCreator
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                      )}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </CardContent>

      {/* Message Input + AI helpers */}
      <div className="border-t border-border p-4 space-y-3">
        {error && (
          <p className="text-xs text-destructive mb-1">{error}</p>
        )}

        {scanInsights && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-2 text-xs space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 font-medium text-primary">
                <Sparkles className="h-3 w-3" />
                Thread scan insights
              </div>
              <button
                type="button"
                className="text-[10px] text-primary/70 hover:underline"
                onClick={() => setScanInsights(null)}
              >
                Clear
              </button>
            </div>
            {scanInsights.insights?.length > 0 && (
              <ul className="list-disc pl-4">
                {scanInsights.insights.slice(0, 3).map((i, idx) => (
                  <li key={idx}>{i}</li>
                ))}
              </ul>
            )}
            {scanInsights.riskFlags?.length > 0 && (
              <p className="text-destructive/80">
                Risks: {scanInsights.riskFlags.slice(0, 3).join('; ')}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs"
            disabled={suggestionsLoading === 'scan' || messages.length === 0}
            onClick={() => callSuggestionApi('scan')}
          >
            {suggestionsLoading === 'scan' ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            Scan Thread
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs border-circe/40 text-circe-light"
            disabled={suggestionsLoading === 'circe' || messages.length === 0}
            onClick={() => callSuggestionApi('circe')}
          >
            {suggestionsLoading === 'circe' ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Moon className="h-3 w-3" />
            )}
            Circe Reply
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs border-gold/50 text-gold"
            disabled={suggestionsLoading === 'venus' || messages.length === 0}
            onClick={() => callSuggestionApi('venus')}
          >
            {suggestionsLoading === 'venus' ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sun className="h-3 w-3" />
            )}
            Venus Reply
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs border-pink-500/50 text-pink-500"
            disabled={suggestionsLoading === 'flirt' || messages.length === 0}
            onClick={() => callSuggestionApi('flirt')}
          >
            {suggestionsLoading === 'flirt' ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Heart className="h-3 w-3" />
            )}
            Flirt Reply
          </Button>
        </div>

        {(activePanel === 'circe' && circeSuggestions) ||
        (activePanel === 'venus' && venusSuggestions) ||
        (activePanel === 'flirt' && flirtSuggestions) ? (
          <div className="rounded-md border border-border bg-secondary/40 p-2 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">
                {activePanel === 'circe'
                  ? 'Circe spell suggestions'
                  : activePanel === 'venus'
                    ? 'Venus charm suggestions'
                    : 'Flirt mode suggestions'}
              </span>
              <button
                type="button"
                className="text-[10px] text-muted-foreground hover:underline"
                onClick={() => setActivePanel(null)}
              >
                Close
              </button>
            </div>
            <div className="space-y-1">
              {(activePanel === 'circe'
                ? circeSuggestions
                : activePanel === 'venus'
                  ? venusSuggestions
                  : flirtSuggestions
              )
                ?.slice(0, 3)
                .map((text, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="w-full rounded border border-border bg-background px-2 py-1 text-left text-xs hover:border-primary hover:bg-primary/5"
                    onClick={() => {
                      setMessage(text)
                      setActivePanel(null)
                    }}
                  >
                    {text}
                  </button>
                ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Tap to insert, then edit before sending. Generated by{' '}
              {activePanel === 'circe' ? 'Circe' : activePanel === 'venus' ? 'Venus' : 'Flirt'}.
            </p>
          </div>
        ) : null}

        <input
          ref={chatFileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={handleChatFileUpload}
        />
        <div className="flex flex-col gap-1.5 w-full">
          {(attachedMediaIds.length > 0 || ppvPrice) && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {attachedMediaIds.length > 0 && (
                <span className="text-muted-foreground">
                  {attachedMediaIds.length} attachment{attachedMediaIds.length > 1 ? 's' : ''}
                </span>
              )}
              {ppvPrice && (
                <Badge className="bg-chart-4/20 text-chart-4">
                  <DollarSign className="mr-1 h-3 w-3" />
                  PPV ${ppvPrice}
                </Badge>
              )}
            </div>
        )}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="flex-shrink-0"
            disabled={conversation?.platform !== 'onlyfans' || uploadingMedia}
            onClick={() => chatFileInputRef.current?.click()}
            title={conversation?.platform === 'onlyfans' ? 'Attach photo or video (PPV)' : 'Media only for OnlyFans'}
          >
            {uploadingMedia ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
          </Button>
          <div className="flex items-center gap-1 flex-shrink-0">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              min={0}
              step={0.01}
              placeholder="PPV $"
              value={ppvPrice}
              onChange={(e) => setPpvPrice(e.target.value)}
              className="w-16 h-8 text-xs"
              title="Optional price for paid content"
            />
          </div>
          <div className="relative flex-1">
            <Input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-input pr-10"
              disabled={sending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && (message.trim() || attachedMediaIds.length > 0)) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2">
              <VoiceInputButton
                onTranscript={(text) => setMessage(prev => prev + (prev ? ' ' : '') + text)}
                size="sm"
                variant="ghost"
              />
            </div>
          </div>
          <Button 
            size="icon" 
            disabled={(!message.trim() && attachedMediaIds.length === 0) || sending}
            onClick={handleSendMessage}
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          You can send paid (PPV) content: set a price and/or attach media so the fan pays to unlock.
        </p>
      </div>
    </Card>
  )
}
