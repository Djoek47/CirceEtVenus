'use client'

import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  CheckCheck,
  Mail,
  Trash2,
  ChevronDown,
  ChevronRight,
  PanelLeft,
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
import { getProxiedMediaPresentation, isVideoMedia, type RawOnlyFansMedia } from '@/lib/messages/of-media'
import { FanProfileModal } from '@/components/messages/fan-profile-modal'

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
  onOpenConversationMenu?: () => void
}

function buildMediaSrcChain(pres: ReturnType<typeof getProxiedMediaPresentation>): string[] {
  const o: string[] = []
  const push = (u: string | undefined) => {
    if (u && !o.includes(u)) o.push(u)
  }
  push(pres.displaySrc)
  push(pres.altSrc)
  push(pres.directSrc)
  push(pres.directAltSrc)
  return o
}

function ChatMediaItem({ media }: { media: OnlyFansMedia }) {
  const pres = useMemo(() => getProxiedMediaPresentation(media as RawOnlyFansMedia), [
    media.id,
    media.type,
    media.canView,
    media.files?.full?.url,
    media.files?.thumb?.url,
    media.files?.preview?.url,
    media.files?.squarePreview?.url,
    media.url,
    media.preview,
  ])
  const imgChain = useMemo(() => buildMediaSrcChain(pres), [pres])
  const videoChain = useMemo(() => buildMediaSrcChain(pres), [pres])
  const posterChain = useMemo(() => {
    const o: string[] = []
    const push = (u: string | undefined) => {
      if (u && !o.includes(u)) o.push(u)
    }
    push(pres.poster)
    push(pres.directPoster)
    return o
  }, [pres])

  const [imgIdx, setImgIdx] = useState(0)
  const [videoIdx, setVideoIdx] = useState(0)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setImgIdx(0)
    setVideoIdx(0)
    setFailed(false)
  }, [imgChain.join('\0'), videoChain.join('\0')])

  const imgSrc = imgChain[imgIdx]
  const videoSrc = videoChain[videoIdx]
  const videoPoster = posterChain[Math.min(videoIdx, Math.max(0, posterChain.length - 1))] ?? undefined
  const openOriginalHref =
    pres.directSrc ||
    pres.directAltSrc ||
    (media as RawOnlyFansMedia).files?.full?.url ||
    (media as RawOnlyFansMedia).url ||
    undefined

  if (!media.canView && media.canView !== undefined) {
    return (
      <div className="relative rounded-lg bg-muted/50 p-4 text-center">
        <p className="text-sm text-muted-foreground">Locked media</p>
      </div>
    )
  }

  if (failed) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-center space-y-2">
        <p className="text-sm text-muted-foreground">Could not load media</p>
        {openOriginalHref && /^https?:\/\//i.test(openOriginalHref) && (
          <a href={openOriginalHref} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
            Open original
          </a>
        )}
      </div>
    )
  }

  const video = isVideoMedia(media as RawOnlyFansMedia)

  if (video) {
    const src = videoSrc
    if (!src) {
      return (
        <div className="rounded-lg bg-muted/50 p-4 text-center">
          <p className="text-sm text-muted-foreground">Video unavailable</p>
        </div>
      )
    }
    return (
      <video
        src={src}
        poster={videoPoster}
        controls
        playsInline
        className="rounded-lg max-w-full"
        referrerPolicy="no-referrer"
        onError={() => {
          if (videoIdx < videoChain.length - 1) {
            setVideoIdx((i) => i + 1)
          } else {
            setFailed(true)
          }
        }}
      />
    )
  }

  if (!imgSrc) {
    return (
      <div className="rounded-lg bg-muted/50 p-4 text-center">
        <p className="text-sm text-muted-foreground">Image unavailable</p>
      </div>
    )
  }

  return (
    <img
      src={imgSrc}
      alt="Media"
      className="rounded-lg max-w-full h-auto"
      referrerPolicy="no-referrer"
      loading="lazy"
      decoding="async"
      onError={() => {
        if (imgIdx < imgChain.length - 1) {
          setImgIdx((i) => i + 1)
        } else {
          setFailed(true)
        }
      }}
    />
  )
}

function ChatPreviewImage({ rawUrl }: { rawUrl: string }) {
  const chain = useMemo(() => {
    const proxied = proxyImageUrl(rawUrl) || rawUrl
    const o: string[] = []
    if (proxied) o.push(proxied)
    if (rawUrl && rawUrl !== proxied) o.push(rawUrl)
    return o
  }, [rawUrl])
  const [idx, setIdx] = useState(0)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    setIdx(0)
    setHidden(false)
  }, [chain.join('\0')])

  const src = chain[idx]
  if (hidden || !src) return null

  return (
    <img
      src={src}
      alt="Preview"
      className="rounded-lg max-w-full h-auto"
      referrerPolicy="no-referrer"
      loading="lazy"
      decoding="async"
      onError={() => {
        if (idx < chain.length - 1) setIdx((i) => i + 1)
        else setHidden(true)
      }}
    />
  )
}

export function ChatWindow({
  conversation,
  userId: _userId,
  onMessageSent,
  onOpenConversationMenu,
}: ChatWindowProps) {
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
  /** After switching threads or initial load, jump to latest message (top-of-thread is wrong default). */
  const pendingScrollToLatestRef = useRef(false)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Pause OnlyFans message polling after 429 until this timestamp (ms). */
  const onlyFansPollBackoffUntilRef = useRef(0)
  const supabase = useMemo(() => createClient(), [])
  const [niches, setNiches] = useState<string[]>([])
  const [boundaries, setBoundaries] = useState<string[]>([])
  const [flirtLevel, setFlirtLevel] = useState<number>(2)
  const [flirtKeywords, setFlirtKeywords] = useState<string>('')
  const [creatorPronouns, setCreatorPronouns] = useState<string | null>(null)
  const [creatorGenderIdentity, setCreatorGenderIdentity] = useState<string | null>(null)
  const divinePanel = useDivinePanel()
  const voiceSession = useVoiceSession()
  const [profileOpen, setProfileOpen] = useState(false)
  const [divineMessageIds, setDivineMessageIds] = useState<Set<string>>(() => new Set())
  const [divineTyping, setDivineTyping] = useState(false)
  const handleSendMessageRef = useRef<() => Promise<void>>(async () => {})
  const messageRef = useRef('')
  messageRef.current = message
  const composerTypeAbortRef = useRef<AbortController | null>(null)
  /** Keep scan tools collapsed by default so the thread remains readable. */
  const [aiSectionOpen, setAiSectionOpen] = useState(false)
  const isOnlyFansConversation = conversation?.platform === 'onlyfans'

  useEffect(() => {
    const hasAiContent =
      scanInsights ||
      activePanel ||
      (circeSuggestions && circeSuggestions.length > 0) ||
      (venusSuggestions && venusSuggestions.length > 0) ||
      (flirtSuggestions && flirtSuggestions.length > 0)
    if (hasAiContent) setAiSectionOpen(true)
  }, [scanInsights, activePanel, circeSuggestions, venusSuggestions, flirtSuggestions])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollContainerToLatest = () => {
    const el = messagesContainerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
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

  useEffect(() => {
    composerTypeAbortRef.current?.abort()
    composerTypeAbortRef.current = null
    setDivineTyping(false)
  }, [conversation?.user?.id])

  const applyComposerTextAnimated = useCallback(
    async (fullText: string, replace: boolean, opts?: { skipAnimation?: boolean }) => {
      composerTypeAbortRef.current?.abort()
      const ac = new AbortController()
      composerTypeAbortRef.current = ac

      if (opts?.skipAnimation === true) {
        setMessage((prev) => (replace ? fullText : prev + fullText))
        composerTypeAbortRef.current = null
        return
      }

      setDivineTyping(true)
      const prefix = replace ? '' : messageRef.current
      if (replace) setMessage('')

      const total = fullText.length
      const chunk = total > 160 ? 3 : total > 70 ? 2 : 1
      const delayMs = total > 280 ? 10 : total > 120 ? 15 : 22

      try {
        for (let i = 0; i < total; i += chunk) {
          if (ac.signal.aborted) return
          const end = Math.min(i + chunk, total)
          setMessage(prefix + fullText.slice(0, end))
          await new Promise<void>((resolve) => setTimeout(resolve, delayMs))
        }
      } finally {
        if (composerTypeAbortRef.current === ac) {
          setDivineTyping(false)
          composerTypeAbortRef.current = null
        }
      }
    },
    [],
  )

  const buildNormalizedMessages = (): NormalizedChatMessage[] => {
    return messages.slice(-30).map((m) => ({
      from: m.fromUser.id === conversation?.user.id ? 'fan' : 'creator',
      text: stripHtml(m.text || ''),
      createdAt: m.createdAt,
    }))
  }

  // When a conversation becomes active, automatically focus that fan for Divine + voice (primitives-only deps to avoid infinite loop when context updates).
  // Normalize id (API may flip number/string) and trim strings (undefined vs "" must not oscillate deps).
  const focusedFanIdKey =
    conversation?.user?.id != null && conversation.user.id !== ''
      ? String(conversation.user.id)
      : undefined
  const focusedFanUsername = conversation?.user?.username?.trim() || undefined
  const focusedFanName = conversation?.user?.name?.trim() || undefined
  useLayoutEffect(() => {
    if (focusedFanIdKey == null || !divinePanel) return
    const fan = {
      id: focusedFanIdKey,
      username: focusedFanUsername,
      name: focusedFanName,
    }
    const cur = divinePanel.focusedFan
    const curVoice = voiceSession?.focusedFanForVoice
    const fieldsMatch = (
      a: { id: string; username?: string | null; name?: string | null } | null | undefined,
    ) =>
      a != null &&
      String(a.id) === fan.id &&
      (a.username?.trim() || undefined) === fan.username &&
      (a.name?.trim() || undefined) === fan.name
    if (fieldsMatch(cur) && fieldsMatch(curVoice)) return
    if (!fieldsMatch(cur)) divinePanel.setFocusedFan(fan)
    if (!fieldsMatch(curVoice)) voiceSession?.setFocusedFanForVoice(fan)
    // Intentionally omit divinePanel/voiceSession from deps: their refs change when we call setFocusedFan, which would retrigger this effect and cause "Maximum update depth exceeded" (React #185).
  }, [focusedFanIdKey, focusedFanUsername, focusedFanName])

  const dmSuggestionBridge = divinePanel?.dmSuggestionBridge ?? null
  const clearDmSuggestionBridge = divinePanel?.clearDmSuggestionBridge
  useEffect(() => {
    if (!dmSuggestionBridge || !conversation || !clearDmSuggestionBridge) return
    if (String(conversation.user.id) !== String(dmSuggestionBridge.fanId)) return

    setScanInsights(
      dmSuggestionBridge.scan ?? {
        insights: [],
        riskFlags: [],
        suggestedAngles: [],
      },
    )
    setCirceSuggestions(
      dmSuggestionBridge.circeSuggestions.length ? dmSuggestionBridge.circeSuggestions : null,
    )
    setVenusSuggestions(
      dmSuggestionBridge.venusSuggestions.length ? dmSuggestionBridge.venusSuggestions : null,
    )
    setFlirtSuggestions(
      dmSuggestionBridge.flirtSuggestions.length ? dmSuggestionBridge.flirtSuggestions : null,
    )
    setActivePanel(dmSuggestionBridge.highlightPanel)
    clearDmSuggestionBridge()
  }, [conversation?.user?.id, dmSuggestionBridge, clearDmSuggestionBridge])

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
      pendingScrollToLatestRef.current = false
      return
    }

    pendingScrollToLatestRef.current = true
    setMessages([])
    const loadMessages = async () => {
      setLoading(true)
      setError(null)

      try {
        if (conversation.platform !== 'onlyfans') {
          setMessages([])
          setError('Fansly thread view is not available yet on web messages.')
          return
        }
        const res = await fetch(`/api/onlyfans/messages/${conversation.user.id}?limit=50`)
        let data: { error?: string; code?: string; messages?: OnlyFansMessage[] } = {}
        try {
          data = (await res.json()) as typeof data
        } catch {
          data = {}
        }

        if (!res.ok) {
          const rateLimited = res.status === 429 || data.code === 'ONLYFANS_RATE_LIMIT'
          if (rateLimited) {
            onlyFansPollBackoffUntilRef.current = Date.now() + 90_000
          }
          throw new Error(
            data.error ||
              (rateLimited
                ? 'OnlyFans is temporarily limiting requests. Wait a minute, then try again.'
                : 'Failed to load messages'),
          )
        }

        setMessages(normalizeAndSortMessages(data.messages || []))
        void fetch(
          `/api/divine/dm-send-events?fan_id=${encodeURIComponent(String(conversation.user.id))}`,
          { credentials: 'include' },
        )
          .then((r) => r.json())
          .then((j: { events?: Array<{ onlyfans_message_id?: string | null }> }) => {
            const ids = new Set<string>()
            for (const e of j.events ?? []) {
              if (e.onlyfans_message_id) ids.add(String(e.onlyfans_message_id))
            }
            if (ids.size) setDivineMessageIds((prev) => new Set([...prev, ...ids]))
          })
          .catch(() => undefined)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load messages')
      } finally {
        setLoading(false)
      }
    }

    loadMessages()
    // Prefer id + platform over full `conversation` so parents that pass inline objects
    // (or stale memo) cannot retrigger this effect every render (React #185).
  }, [conversation?.user?.id, conversation?.platform])

  // Opened a thread or finished loading: jump to latest before paint (avoids flash at top).
  useLayoutEffect(() => {
    if (loading) return
    if (!pendingScrollToLatestRef.current) return
    const run = () => {
      scrollContainerToLatest()
      pendingScrollToLatestRef.current = false
    }
    run()
    requestAnimationFrame(() => {
      requestAnimationFrame(run)
    })
  }, [messages, loading])

  // New messages while staying in the same thread: only follow if already near the bottom.
  useEffect(() => {
    if (loading) return
    if (pendingScrollToLatestRef.current) return
    if (isNearBottom()) scrollToBottom()
  }, [messages, loading])

  // Poll for new messages (OnlyFans route only). Delay first poll + slower interval to reduce rate-limit bursts with voice navigation + thread refresh.
  useEffect(() => {
    if (!conversation || conversation.platform !== 'onlyfans') return
    if (loading) return

    const poll = async () => {
      if (!conversation) return
      if (Date.now() < onlyFansPollBackoffUntilRef.current) return
      setIsPolling(true)
      try {
        const res = await fetch(`/api/onlyfans/messages/${conversation.user.id}?limit=50`)
        let data: { messages?: OnlyFansMessage[]; code?: string } = {}
        try {
          data = (await res.json()) as typeof data
        } catch {
          return
        }
        if (res.status === 429 || data.code === 'ONLYFANS_RATE_LIMIT') {
          onlyFansPollBackoffUntilRef.current = Date.now() + 90_000
          return
        }
        if (res.ok && data?.messages) {
          setMessages((prev) => normalizeAndSortMessages([...prev, ...(data.messages || [])]))
        }
      } catch {
        // silent
      } finally {
        setIsPolling(false)
      }
    }

    if (pollStartTimeoutRef.current) clearTimeout(pollStartTimeoutRef.current)
    pollStartTimeoutRef.current = setTimeout(() => {
      void poll()
      pollIntervalRef.current = setInterval(poll, 12_000)
    }, 8_000)

    return () => {
      if (pollStartTimeoutRef.current) {
        clearTimeout(pollStartTimeoutRef.current)
        pollStartTimeoutRef.current = null
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [conversation?.user?.id, conversation?.platform, loading])

  useEffect(() => {
    if (!divinePanel || !conversation) return
    const fanId = String(conversation.user.id)
    const platform = conversation.platform
    return divinePanel.registerComposerBridge({
      fanId,
      platform,
      setComposerText: (text, replace) => {
        setMessage((prev) => (replace === false ? prev + text : text))
      },
      applyComposerTextAnimated,
      getComposerText: () => messageRef.current,
      setComposerPrice: (p) => setPpvPrice(p),
      setComposerMediaIds: (ids) => setAttachedMediaIds(ids),
      sendFromComposer: async () => {
        await handleSendMessageRef.current()
      },
    })
  }, [divinePanel, conversation?.user?.id, conversation?.platform, applyComposerTextAnimated])

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

  const handleSendMessage = useCallback(async () => {
    if ((!message.trim() && attachedMediaIds.length === 0) || !conversation || sending) return
    if (conversation.platform !== 'onlyfans') {
      setError('Sending Fansly messages from this page is not available yet.')
      return
    }

    composerTypeAbortRef.current?.abort()
    composerTypeAbortRef.current = null
    setDivineTyping(false)

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

      const data = (await res.json()) as {
        error?: string
        message?: OnlyFansMessage & { id?: string | number }
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      if (data.message) {
        const mid = data.message.id != null ? String(data.message.id) : ''
        setMessages((prev) => normalizeAndSortMessages([...prev, data.message as OnlyFansMessage]))
        setTimeout(() => scrollToBottom(), 0)
        const source = divinePanel?.consumePendingDmSendSource() ?? 'user'
        if (source !== 'user') {
          if (mid) setDivineMessageIds((prev) => new Set(prev).add(mid))
          void fetch('/api/divine/dm-send-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              fan_id: String(conversation.user.id),
              platform: conversation.platform === 'fansly' ? 'fansly' : 'onlyfans',
              body_preview: messageText.slice(0, 2000),
              source,
              ...(mid ? { onlyfans_message_id: mid } : {}),
            }),
          }).catch(() => undefined)
        }
      }
      void fetch('/api/divine/refresh-thread-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fanId: String(conversation.user.id),
          platform: conversation.platform === 'fansly' ? 'fansly' : 'onlyfans',
        }),
      }).catch(() => undefined)
      onMessageSent?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
      setMessage(messageText)
      setAttachedMediaIds(mediaIdsToSend)
      if (priceToSend != null) setPpvPrice(String(priceToSend))
    } finally {
      setSending(false)
    }
  }, [
    message,
    attachedMediaIds,
    ppvPrice,
    conversation,
    sending,
    divinePanel,
    onMessageSent,
  ])

  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage
  }, [handleSendMessage])

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
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-border bg-card">
      {/* Chat Header */}
      <CardHeader className="flex flex-row items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            disabled={!onOpenConversationMenu}
            onClick={onOpenConversationMenu}
            aria-label="Open conversations menu"
            title="Open conversations menu"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-10 w-10 border border-border">
            <AvatarImage
              src={proxyImageUrl(fan.avatar) || fan.avatar}
              referrerPolicy="no-referrer"
              className="object-cover"
            />
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
            <DropdownMenuItem
              onClick={() => {
                setProfileOpen(true)
              }}
            >
              <User className="mr-2 h-4 w-4" />
              View Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              if (conversation.platform !== 'onlyfans') {
                setError('Fansly thread refresh is not available yet on web messages.')
                return
              }
              setLoading(true)
              fetch(`/api/onlyfans/messages/${conversation.user.id}`)
                .then(res => res.json())
                .then(data => setMessages(data.messages || []))
                .finally(() => setLoading(false))
            }}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Messages
            </DropdownMenuItem>
            {conversation.platform === 'onlyfans' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    const cid = String(conversation.chatId || conversation.user.id)
                    await fetch(`/api/onlyfans/chats/${encodeURIComponent(cid)}/read`, { method: 'POST' })
                  }}
                >
                  <CheckCheck className="mr-2 h-4 w-4" />
                  Mark as read
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    const cid = String(conversation.chatId || conversation.user.id)
                    await fetch(`/api/onlyfans/chats/${encodeURIComponent(cid)}/unread`, { method: 'POST' })
                  }}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Mark as unread
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={async () => {
                    const cid = String(conversation.chatId || conversation.user.id)
                    const ok = window.confirm('Delete this chat on OnlyFans? This cannot be undone.')
                    if (!ok) return
                    const res = await fetch(`/api/onlyfans/chats/${encodeURIComponent(cid)}`, { method: 'DELETE' })
                    if (res.ok) onMessageSent?.()
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete chat
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      {/* Messages Area — live thread with the fan */}
      <CardContent
        ref={messagesContainerRef}
        className="min-h-[36vh] flex-1 overflow-y-auto p-3 sm:min-h-[42vh] sm:p-4"
      >
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:mb-3">
          Fan conversation
        </p>
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
                if (conversation.platform !== 'onlyfans') {
                  setError('Fansly thread view is not available yet on web messages.')
                  return
                }
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
              const isDivineAssisted =
                isCreator && divineMessageIds.has(String(msg.id))
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
                      'max-w-[82%] rounded-2xl px-4 py-2',
                      isDivineAssisted
                        ? 'border border-violet-400/50 bg-violet-950/35 text-violet-50'
                        : isCreator
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground'
                    )}
                  >
                    {isDivineAssisted && (
                      <p className="mb-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-violet-200/90">
                        <Sparkles className="h-3 w-3" />
                        Divine-assisted
                      </p>
                    )}
                    {msg.media && msg.media.length > 0 && (
                      <div className="mb-2 space-y-2">
                        {msg.media.map((m) => (
                          <ChatMediaItem key={m.id} media={m} />
                        ))}
                      </div>
                    )}
                    {/* Show preview images if media array is empty but previews exist */}
                    {(!msg.media || msg.media.length === 0) && msg.previews && msg.previews.length > 0 && (
                      <div className="mb-2 space-y-2">
                        {msg.previews.map((p, idx) => (
                          <ChatPreviewImage key={idx} rawUrl={p.url} />
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
                        isDivineAssisted
                          ? 'text-violet-200/70'
                          : isCreator
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

      {/* Composer stays visible; Divine AI tools collapse on small screens so the thread keeps space */}
      <div className="flex flex-shrink-0 flex-col border-t border-border bg-card">
        <Collapsible open={aiSectionOpen} onOpenChange={setAiSectionOpen}>
          <div className="flex items-center gap-2 border-b border-border/60 px-2 py-1 sm:px-3">
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 min-w-0 flex-1 justify-start gap-2 px-2 text-left text-xs font-medium sm:flex-none"
              >
                {aiSectionOpen ? (
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />
                )}
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate">Divine AI — scan & suggestions</span>
              </Button>
            </CollapsibleTrigger>
            <span className="hidden shrink-0 text-[10px] text-muted-foreground md:inline">Not sent to fan</span>
          </div>
          <CollapsibleContent>
            <div className="max-h-[min(28vh,180px)] space-y-2 overflow-y-auto border-b border-border/50 bg-muted/15 px-3 py-2 sm:max-h-[min(30vh,220px)] sm:px-4">
              {scanInsights && (
                <div className="space-y-1 rounded-md border border-primary/30 bg-primary/5 p-2 text-xs">
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

              <div className="flex flex-wrap gap-1.5 sm:gap-2">
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
                  Scan
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 border-circe/40 text-xs text-circe-light"
                  disabled={suggestionsLoading === 'circe' || messages.length === 0}
                  onClick={() => callSuggestionApi('circe')}
                >
                  {suggestionsLoading === 'circe' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Moon className="h-3 w-3" />
                  )}
                  Circe
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 border-gold/50 text-xs text-gold"
                  disabled={suggestionsLoading === 'venus' || messages.length === 0}
                  onClick={() => callSuggestionApi('venus')}
                >
                  {suggestionsLoading === 'venus' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sun className="h-3 w-3" />
                  )}
                  Venus
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 border-pink-500/50 text-xs text-pink-500"
                  disabled={suggestionsLoading === 'flirt' || messages.length === 0}
                  onClick={() => callSuggestionApi('flirt')}
                >
                  {suggestionsLoading === 'flirt' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Heart className="h-3 w-3" />
                  )}
                  Flirt
                </Button>
              </div>

              {(activePanel === 'circe' && circeSuggestions) ||
              (activePanel === 'venus' && venusSuggestions) ||
              (activePanel === 'flirt' && flirtSuggestions) ? (
                <div className="space-y-2 rounded-md border border-border bg-secondary/40 p-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">
                      {activePanel === 'circe'
                        ? 'Circe suggestions'
                        : activePanel === 'venus'
                          ? 'Venus suggestions'
                          : 'Flirt suggestions'}
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
                          className="w-full rounded border border-border bg-background px-2 py-1.5 text-left text-xs leading-snug hover:border-primary hover:bg-primary/5"
                          onClick={() => {
                            setActivePanel(null)
                            void applyComposerTextAnimated(text, true, { skipAnimation: false })
                          }}
                        >
                          {text}
                        </button>
                      ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Tap to insert — edit before sending.
                  </p>
                </div>
              ) : null}

              <p className="text-[10px] leading-snug text-muted-foreground/90">
                Only the fan thread above is visible to fans. Scan & suggestions stay in Creatix until you send.
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {error && messages.length > 0 && (
          <div className="border-b border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive sm:px-4">
            {error}
          </div>
        )}

        <div className="space-y-2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-4 sm:pb-3">
          <input
            ref={chatFileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleChatFileUpload}
          />
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

          <div className="flex min-w-0 items-end gap-2">
            <div className="flex shrink-0 flex-col gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11"
                disabled={!isOnlyFansConversation || uploadingMedia}
                onClick={() => chatFileInputRef.current?.click()}
                title={
                  isOnlyFansConversation
                    ? 'Attach photo or video (PPV)'
                    : 'Media only for OnlyFans'
                }
              >
                {uploadingMedia ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
              </Button>
              <div className="flex items-center gap-0.5">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="PPV"
                  value={ppvPrice}
                  onChange={(e) => setPpvPrice(e.target.value)}
                  className="h-8 w-[3.25rem] px-1.5 text-xs"
                  title="Optional PPV price"
                />
              </div>
            </div>

            <div className="relative min-w-0 flex-1">
              {divineTyping && (
                <div className="pointer-events-none absolute inset-x-0 -top-5 z-10 flex items-center gap-1.5 text-[11px] font-medium text-primary">
                  <span className="inline-flex gap-0.5">
                    <span className="h-1 w-1 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
                    <span className="h-1 w-1 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
                    <span className="h-1 w-1 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
                  </span>
                  <span className="tracking-tight">Divine is typing…</span>
                </div>
              )}
              <Textarea
                placeholder="Message… (Shift+Enter for new line)"
                value={message}
                onChange={(e) => {
                  if (divineTyping) {
                    composerTypeAbortRef.current?.abort()
                    composerTypeAbortRef.current = null
                    setDivineTyping(false)
                  }
                  setMessage(e.target.value)
                }}
                rows={2}
                className={cn(
                  'min-h-[4.5rem] resize-y bg-input pr-10 text-sm leading-relaxed sm:min-h-[5rem] sm:text-sm',
                  divineTyping && 'ring-2 ring-primary/45 ring-offset-0',
                )}
                disabled={sending || !isOnlyFansConversation}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (message.trim() || attachedMediaIds.length > 0) handleSendMessage()
                  }
                }}
              />
              <div className="absolute bottom-2 right-2">
                <VoiceInputButton
                  onTranscript={(text) => {
                    if (divineTyping) {
                      composerTypeAbortRef.current?.abort()
                      composerTypeAbortRef.current = null
                      setDivineTyping(false)
                    }
                    setMessage((prev) => prev + (prev ? ' ' : '') + text)
                  }}
                  size="sm"
                  variant="ghost"
                />
              </div>
            </div>

            <Button
              size="icon"
              className="h-11 w-11 shrink-0"
              disabled={(!message.trim() && attachedMediaIds.length === 0) || sending || !isOnlyFansConversation}
              onClick={handleSendMessage}
            >
              {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </div>

          <p className="hidden text-[10px] text-muted-foreground sm:block">
            PPV: set price and/or attach media. Fan only sees the conversation above.
          </p>
          <p className="text-[10px] text-muted-foreground sm:hidden">Tip: collapse Divine AI above to see more of the thread.</p>
        </div>
      </div>
      <FanProfileModal
        open={profileOpen}
        onOpenChange={setProfileOpen}
        fanId={String(fan.id)}
        platform={conversation.platform === 'onlyfans' ? 'onlyfans' : 'fansly'}
        initialUsername={fan.username}
        initialName={fan.name}
        initialAvatar={fan.avatar}
      />
    </Card>
  )
}
