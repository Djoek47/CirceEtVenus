'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import {
  applyDivineUiActions as applyDivineUiActionsBase,
  DIVINE_COMPOSER_MEDIA_MAX,
  DIVINE_TRANSCRIPT_MAX,
  type DivineUiAction,
  type DmSuggestionBridgePayload,
} from '@/lib/divine/divine-ui-actions'
import type { DivineVoiceMemoryPayload } from '@/lib/divine/voice-memory-types'
import { buildDeferredNavigationActions } from '@/lib/divine/deferred-navigation'
import { formatFanLookupHint, type DivineLookupMeta } from '@/lib/divine/divine-lookup-meta'

export type { DivineUiAction, DmSuggestionBridgePayload } from '@/lib/divine/divine-ui-actions'

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

export type FocusedFan = {
  id: string
  username?: string | null
  name?: string | null
}

/** Active ChatWindow registers so Divine tools can fill composer / auto-send. */
export type DivineComposerBridge = {
  fanId: string
  platform: 'onlyfans' | 'fansly'
  setComposerText: (text: string, replace?: boolean) => void
  /**
   * Visible typewriter into the composer; resolves when done (or skipped).
   * Used so scheduled auto-send starts only after typing finishes.
   */
  applyComposerTextAnimated?: (
    text: string,
    replace: boolean,
    opts?: { skipAnimation?: boolean },
  ) => Promise<void>
  getComposerText: () => string
  setComposerPrice: (price: string) => void
  setComposerMediaIds: (ids: string[]) => void
  sendFromComposer: () => Promise<void>
}

export type DmSendAttributionSource = 'user' | 'divine' | 'divine_scheduled'

type DivinePanelContextValue = {
  user: User
  panelOpen: boolean
  setPanelOpen: (open: boolean) => void
  panelCollapsed: boolean
  setPanelCollapsed: (collapsed: boolean) => void
  focusedFan: FocusedFan | null
  setFocusedFan: (fan: FocusedFan | null) => void
  chatMessages: ChatMessage[]
  setChatMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void
  chatInput: string
  setChatInput: (value: string) => void
  chatLoading: boolean
  chatWorkingHint: string | null
  fanLookupHint: string | null
  setFanLookupHint: (hint: string | null) => void
  sendChat: () => Promise<void>
  generatedText: string | null
  setGeneratedText: (text: string | null) => void
  generatePrompt: string
  setGeneratePrompt: (value: string) => void
  generateLoading: boolean
  requestGenerate: () => Promise<void>
  copyGenerated: () => void
  dmSuggestionBridge: DmSuggestionBridgePayload | null
  clearDmSuggestionBridge: () => void
  applyUiActionsFromTools: (actions: DivineUiAction[] | undefined) => void
  /** Active fan in overlay (alias for multi-tab). */
  dmOverlayFanId: string | null
  /** All fans open in the floating DM hub. */
  dmOverlayFanIds: string[]
  setDmOverlayActiveFanId: (fanId: string) => void
  dmOverlayCollapsed: boolean
  setDmOverlayCollapsed: (collapsed: boolean) => void
  closeDmOverlay: () => void
  removeDmOverlayFan: (fanId: string) => void
  /** Copyable transcript above voice pill. */
  divineTranscript: { text: string; title?: string } | null
  dismissDivineTranscript: () => void
  /** ms remaining for scheduled auto-send (0 if none). */
  scheduledDmRemainingMs: number
  cancelScheduledDm: () => void
  /** Default from settings; tools may override per call. */
  divineSendDelayMs: number
  registerComposerBridge: (bridge: DivineComposerBridge) => () => void
  /** Next successful send from composer should log with this source (ChatWindow reads). */
  consumePendingDmSendSource: () => DmSendAttributionSource
  peekPendingDmSendSource: () => DmSendAttributionSource
  clearPendingDmSendSource: () => void
}

const DivinePanelContext = createContext<DivinePanelContextValue | null>(null)

export function useDivinePanel(): DivinePanelContextValue | null {
  return useContext(DivinePanelContext)
}

export function DivinePanelProvider({
  user,
  children,
}: {
  user: User
  children: ReactNode
}) {
  const router = useRouter()
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelCollapsed, setPanelCollapsed] = useState(true)
  const [focusedFan, setFocusedFan] = useState<FocusedFan | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatWorkingHint, setChatWorkingHint] = useState<string | null>(null)
  const [fanLookupHint, setFanLookupHint] = useState<string | null>(null)
  const [generatedText, setGeneratedText] = useState<string | null>(null)
  const [generatePrompt, setGeneratePrompt] = useState('')
  const [generateLoading, setGenerateLoading] = useState(false)
  const [dmSuggestionBridge, setDmSuggestionBridge] = useState<DmSuggestionBridgePayload | null>(null)
  const [dmOverlayFanIds, setDmOverlayFanIds] = useState<string[]>([])
  const [dmOverlayActiveFanId, setDmOverlayActiveFanIdState] = useState<string | null>(null)
  const [dmOverlayCollapsed, setDmOverlayCollapsed] = useState(false)
  const [divineTranscript, setDivineTranscript] = useState<{ text: string; title?: string } | null>(null)
  const [scheduledDm, setScheduledDm] = useState<{ fanId: string; endAt: number } | null>(null)
  const [scheduleUiTick, setScheduleUiTick] = useState(0)
  const [divineSendDelayMs, setDivineSendDelayMs] = useState(3000)

  const bridgesRef = useRef<Map<string, DivineComposerBridge>>(new Map())
  const scheduledEndRef = useRef<number | null>(null)
  const scheduledFanRef = useRef<string | null>(null)
  const dmSendSourceRef = useRef<DmSendAttributionSource>('user')

  const focusedFanIdRef = useRef<string | null>(null)
  focusedFanIdRef.current = focusedFan?.id ?? null

  const clearDmSuggestionBridge = useCallback(() => {
    setDmSuggestionBridge(null)
  }, [])

  const dismissDivineTranscript = useCallback(() => setDivineTranscript(null), [])

  const cancelScheduledDm = useCallback(() => {
    scheduledEndRef.current = null
    scheduledFanRef.current = null
    setScheduledDm(null)
  }, [])

  const setDmOverlayActiveFanId = useCallback((fanId: string) => {
    setDmOverlayFanIds((prev) => (prev.includes(fanId) ? prev : [...prev, fanId]))
    setDmOverlayActiveFanIdState(fanId)
  }, [])

  const closeDmOverlay = useCallback(() => {
    setDmOverlayFanIds([])
    setDmOverlayActiveFanIdState(null)
    setDmOverlayCollapsed(false)
  }, [])

  const removeDmOverlayFan = useCallback((fanId: string) => {
    setDmOverlayFanIds((prev) => {
      const next = prev.filter((x) => x !== fanId)
      setDmOverlayActiveFanIdState((cur) => {
        if (cur !== fanId) return cur
        return next[0] ?? null
      })
      if (next.length === 0) setDmOverlayCollapsed(false)
      return next
    })
  }, [])

  const registerComposerBridge = useCallback((bridge: DivineComposerBridge) => {
    const key = `${bridge.platform}:${bridge.fanId}`
    bridgesRef.current.set(key, bridge)
    return () => {
      bridgesRef.current.delete(key)
    }
  }, [])

  const findBridgeForFan = useCallback((fanId: string): DivineComposerBridge | undefined => {
    for (const b of bridgesRef.current.values()) {
      if (b.fanId === fanId) return b
    }
    return undefined
  }, [])

  const consumePendingDmSendSource = useCallback((): DmSendAttributionSource => {
    const s = dmSendSourceRef.current
    dmSendSourceRef.current = 'user'
    return s
  }, [])

  const peekPendingDmSendSource = useCallback((): DmSendAttributionSource => dmSendSourceRef.current, [])

  const clearPendingDmSendSource = useCallback(() => {
    dmSendSourceRef.current = 'user'
  }, [])

  useEffect(() => {
    void fetch('/api/divine/manager-settings', { credentials: 'include' })
      .then((r) => r.json())
      .then((j: { divine_send_delay_ms?: number }) => {
        if (typeof j.divine_send_delay_ms === 'number' && !Number.isNaN(j.divine_send_delay_ms)) {
          setDivineSendDelayMs(Math.max(0, Math.min(120_000, j.divine_send_delay_ms)))
        }
      })
      .catch(() => undefined)
  }, [user.id])

  useEffect(() => {
    if (!scheduledDm) {
      scheduledEndRef.current = null
      scheduledFanRef.current = null
      return
    }
    scheduledEndRef.current = scheduledDm.endAt
    scheduledFanRef.current = scheduledDm.fanId
    const id = window.setInterval(() => {
      setScheduleUiTick((x) => x + 1)
      const end = scheduledEndRef.current
      const fid = scheduledFanRef.current
      if (end != null && fid != null && Date.now() >= end) {
        scheduledEndRef.current = null
        scheduledFanRef.current = null
        setScheduledDm(null)
        dmSendSourceRef.current = 'divine_scheduled'
        for (const b of bridgesRef.current.values()) {
          if (b.fanId === fid) {
            void b.sendFromComposer()
            break
          }
        }
      }
    }, 250)
    return () => window.clearInterval(id)
  }, [scheduledDm])

  const scheduledDmRemainingMs = useMemo(() => {
    if (!scheduledDm) return 0
    void scheduleUiTick
    return Math.max(0, scheduledDm.endAt - Date.now())
  }, [scheduledDm, scheduleUiTick])

  const scheduleDmCountdown = useCallback((fanId: string, delayMs: number) => {
    if (delayMs <= 0) return
    const endAt = Date.now() + delayMs
    scheduledEndRef.current = endAt
    scheduledFanRef.current = fanId
    setScheduledDm({ fanId, endAt })
  }, [])

  const runAnimatedComposerAndMaybeSchedule = useCallback(
    async (
      composer: Extract<DivineUiAction, { type: 'set_dm_composer' }>,
      schedule: Extract<DivineUiAction, { type: 'schedule_dm_send' }> | null,
    ) => {
      const fanId = String(composer.fanId ?? '').trim()
      if (!/^[a-z0-9_-]{1,64}$/i.test(fanId)) return

      const text =
        typeof composer.text === 'string'
          ? composer.text.replace(/\u0000/g, '').trim().slice(0, DIVINE_TRANSCRIPT_MAX)
          : ''
      const mediaIds = Array.isArray(composer.mediaIds)
        ? composer.mediaIds.map((x) => String(x)).filter(Boolean).slice(0, DIVINE_COMPOSER_MEDIA_MAX)
        : undefined
      const price =
        typeof composer.price === 'number' && !Number.isNaN(composer.price)
          ? composer.price
          : composer.price === null
            ? null
            : undefined

      dmSendSourceRef.current = 'divine'
      const b = findBridgeForFan(fanId)
      if (!b) return

      if (mediaIds?.length) b.setComposerMediaIds(mediaIds)
      if (price != null && !Number.isNaN(price)) b.setComposerPrice(String(price))
      if (price === null) b.setComposerPrice('')

      const replace = composer.replace !== false
      const animate = composer.animateTyping !== false
      const willSchedule = schedule != null && schedule.delayMs > 0
      /** Occasional instant fill before auto-send so it does not always feel identical. */
      const instantVariety = willSchedule && animate && Math.random() < 0.17

      const hasText = text.length > 0
      if (hasText && b.applyComposerTextAnimated) {
        await b.applyComposerTextAnimated(text, replace, {
          skipAnimation: !animate || instantVariety,
        })
      } else {
        b.setComposerText(text, replace)
      }

      if (willSchedule && schedule && (hasText || (mediaIds?.length ?? 0) > 0)) {
        const delayMs = Math.max(0, Math.min(120_000, Math.floor(Number(schedule.delayMs) || 0)))
        scheduleDmCountdown(String(schedule.fanId).trim(), delayMs)
      }
    },
    [findBridgeForFan, scheduleDmCountdown],
  )

  const applyDivineUiActionsWithBridge = useCallback(
    (actions: DivineUiAction[] | undefined) => {
      if (!actions?.length) return

      const bridgeOpts = {
        onShowDmReplySuggestions: (payload: DmSuggestionBridgePayload) => setDmSuggestionBridge(payload),
        onFocusFanOverlay: (fanId: string) => {
          setDmOverlayFanIds((prev) => (prev.includes(fanId) ? prev : [...prev, fanId]))
          setDmOverlayActiveFanIdState(fanId)
          setDmOverlayCollapsed(false)
        },
        currentFocusedFanId: focusedFanIdRef.current,
        onShowDivineTranscript: (payload: { text: string; title?: string }) => setDivineTranscript(payload),
        onSetDmComposer: (payload: {
          fanId: string
          text: string
          replace?: boolean
          mediaIds?: string[]
          price?: number | null
          animateTyping?: boolean
        }) => {
          dmSendSourceRef.current = 'divine'
          const b = findBridgeForFan(payload.fanId)
          if (b) {
            b.setComposerText(payload.text, payload.replace !== false)
            if (payload.mediaIds?.length) b.setComposerMediaIds(payload.mediaIds)
            if (payload.price != null && !Number.isNaN(payload.price)) b.setComposerPrice(String(payload.price))
            if (payload.price === null) b.setComposerPrice('')
          }
        },
        onScheduleDmSend: ({ fanId, delayMs }: { fanId: string; delayMs: number }) => {
          scheduleDmCountdown(fanId, delayMs)
        },
        onCancelScheduledDm: cancelScheduledDm,
        onSwitchOverlayFan: (fanId: string) => {
          setDmOverlayFanIds((prev) => (prev.includes(fanId) ? prev : [...prev, fanId]))
          setDmOverlayActiveFanIdState(fanId)
        },
      }

      const idx = actions.findIndex((a) => a.type === 'set_dm_composer')
      if (idx === -1) {
        applyDivineUiActionsBase(actions, router, setFocusedFan, bridgeOpts)
        return
      }

      const composer = actions[idx] as Extract<DivineUiAction, { type: 'set_dm_composer' }>
      const after = actions.slice(idx + 1)
      const firstAfter = after[0]
      const pairedSchedule =
        firstAfter?.type === 'schedule_dm_send' &&
        String(firstAfter.fanId) === String(composer.fanId)
          ? firstAfter
          : null
      const afterTail = pairedSchedule ? after.slice(1) : after

      const pre = actions.slice(0, idx)
      applyDivineUiActionsBase([...pre, ...afterTail], router, setFocusedFan, bridgeOpts)

      void runAnimatedComposerAndMaybeSchedule(composer, pairedSchedule)
    },
    [router, findBridgeForFan, cancelScheduledDm, scheduleDmCountdown, runAnimatedComposerAndMaybeSchedule],
  )

  useEffect(() => {
    let cancelled = false
    const POLL_MS = 4000

    const clearBarrierNavigation = () =>
      fetch('/api/divine/voice-memory', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ navigation: null }),
      }).catch(() => undefined)

    const tick = async () => {
      if (cancelled) return
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      try {
        const res = await fetch('/api/divine/voice-memory', { credentials: 'include' })
        const json = (await res.json().catch(() => ({}))) as { memory?: DivineVoiceMemoryPayload }
        const mem = json.memory
        const nav = mem?.navigation
        const barrierActive = Boolean(nav?.when === 'all_tasks_complete' && nav.taskIds?.length)
        if (!mem || !barrierActive) return

        const actions = buildDeferredNavigationActions(mem)
        if (actions?.length) {
          applyDivineUiActionsWithBridge(actions)
          await clearBarrierNavigation()
          return
        }

        const tasks = mem.tasks ?? []
        const byId = new Map(tasks.map((t) => [t.id, t]))
        const allTerminal = nav!.taskIds!.every((tid) => {
          const t = byId.get(tid)
          return t && (t.status === 'done' || t.status === 'error')
        })
        if (allTerminal) {
          await clearBarrierNavigation()
        }
      } catch {
        // ignore
      }
    }

    void tick()
    const id = setInterval(() => void tick(), POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [applyDivineUiActionsWithBridge])

  const sendChat = useCallback(async () => {
    const trimmed = chatInput.trim()
    if (!trimmed || chatLoading) return
    setFanLookupHint(null)
    const nextMessages: ChatMessage[] = [
      ...chatMessages,
      { role: 'user', content: trimmed },
    ]
    setChatMessages(nextMessages)
    setChatInput('')
    setChatLoading(true)
    setChatWorkingHint('Thinking…')
    try {
      const res = await fetch('/api/ai/divine-manager-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          focusedFan,
          stream: true,
        }),
      })
      if (!res.ok) throw new Error('Chat request failed')
      const ct = res.headers.get('content-type') || ''
      if (ct.includes('text/event-stream') && res.body) {
        setChatMessages((prev) => [...prev, { role: 'assistant', content: '' }])
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let assembled = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const chunks = buffer.split('\n\n')
          buffer = chunks.pop() ?? ''
          for (const block of chunks) {
            const line = block.trim()
            if (!line.startsWith('data: ')) continue
            let payload: {
              type?: string
              text?: string
              actions?: unknown
              ui_actions?: DivineUiAction[]
              lookup_meta?: DivineLookupMeta[]
              message?: string
            }
            try {
              payload = JSON.parse(line.slice(6)) as typeof payload
            } catch {
              continue
            }
            if (payload.type === 'tools_done') {
              const lm = payload.lookup_meta
              if (lm?.length) {
                setFanLookupHint(
                  formatFanLookupHint(lm[0]) ?? 'Looking for fan id, username, or chat name…',
                )
                setChatWorkingHint('Looking up fan…')
              } else {
                setChatWorkingHint('Drafting reply…')
              }
            }
            if (payload.type === 'token' && payload.text) {
              assembled += payload.text
              setChatMessages((prev) => {
                const copy = [...prev]
                const last = copy[copy.length - 1]
                if (last?.role === 'assistant') {
                  copy[copy.length - 1] = { role: 'assistant', content: assembled }
                }
                return copy
              })
            }
            if (payload.type === 'done') {
              applyDivineUiActionsWithBridge(payload.ui_actions)
              const lm = payload.lookup_meta
              if (lm?.length) {
                setFanLookupHint(formatFanLookupHint(lm[0]) ?? null)
              }
            }
            if (payload.type === 'error') {
              throw new Error(payload.message || 'Stream error')
            }
          }
        }
        if (!assembled.trim()) {
          setChatMessages((prev) => {
            const copy = [...prev]
            const last = copy[copy.length - 1]
            if (last?.role === 'assistant' && !last.content.trim()) {
              copy.pop()
            }
            return copy
          })
        }
      } else {
        const data = (await res.json()) as {
          reply?: string
          error?: string
          ui_actions?: DivineUiAction[]
          lookup_meta?: DivineLookupMeta[]
        }
        if (data.error) throw new Error(data.error)
        if (data.reply) {
          setChatMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
        }
        applyDivineUiActionsWithBridge(data.ui_actions)
        if (data.lookup_meta?.length) {
          setFanLookupHint(formatFanLookupHint(data.lookup_meta[0]) ?? null)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setChatLoading(false)
      setChatWorkingHint(null)
    }
  }, [chatInput, chatMessages, chatLoading, focusedFan, applyDivineUiActionsWithBridge])

  const requestGenerate = useCallback(async () => {
    const prompt = generatePrompt.trim()
    if (!prompt || generateLoading) return
    setGenerateLoading(true)
    setGeneratedText(null)
    try {
      const res = await fetch('/api/ai/divine-manager-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Generate a short message I can copy and send. Reply with only the message text, no extra commentary. My request: ${prompt}`,
            },
          ],
        }),
      })
      if (!res.ok) throw new Error('Generate failed')
      const data = (await res.json()) as { reply?: string }
      if (data.reply) {
        setGeneratedText(data.reply.trim())
      }
    } catch (e) {
      console.error(e)
    } finally {
      setGenerateLoading(false)
    }
  }, [generatePrompt, generateLoading])

  const copyGenerated = useCallback(() => {
    if (generatedText && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(generatedText)
    }
  }, [generatedText])

  const value: DivinePanelContextValue = {
    user,
    panelOpen,
    setPanelOpen,
    panelCollapsed,
    setPanelCollapsed,
    focusedFan,
    setFocusedFan,
    chatMessages,
    setChatMessages,
    chatInput,
    setChatInput,
    chatLoading,
    chatWorkingHint,
    fanLookupHint,
    setFanLookupHint,
    sendChat,
    generatedText,
    setGeneratedText,
    generatePrompt,
    setGeneratePrompt,
    generateLoading,
    requestGenerate,
    copyGenerated,
    dmSuggestionBridge,
    clearDmSuggestionBridge,
    applyUiActionsFromTools: applyDivineUiActionsWithBridge,
    dmOverlayFanId: dmOverlayActiveFanId,
    dmOverlayFanIds,
    setDmOverlayActiveFanId,
    dmOverlayCollapsed,
    setDmOverlayCollapsed,
    closeDmOverlay,
    removeDmOverlayFan,
    divineTranscript,
    dismissDivineTranscript,
    scheduledDmRemainingMs,
    cancelScheduledDm,
    divineSendDelayMs,
    registerComposerBridge,
    consumePendingDmSendSource,
    peekPendingDmSendSource,
    clearPendingDmSendSource,
  }

  return (
    <DivinePanelContext.Provider value={value}>
      {children}
    </DivinePanelContext.Provider>
  )
}
