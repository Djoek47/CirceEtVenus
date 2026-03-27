'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import {
  applyDivineUiActions as applyDivineUiActionsBase,
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
  /** Status line for fan name/username lookup (spellback + resolution). */
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
  /** Voice + tool responses: navigate, focus fan, and hydrate Messages suggestion UI when present. */
  applyUiActionsFromTools: (actions: DivineUiAction[] | undefined) => void
  /** Floating DM thread (when dm_focus_mode is overlay). */
  dmOverlayFanId: string | null
  dmOverlayCollapsed: boolean
  setDmOverlayCollapsed: (collapsed: boolean) => void
  closeDmOverlay: () => void
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
  const [dmOverlayFanId, setDmOverlayFanId] = useState<string | null>(null)
  const [dmOverlayCollapsed, setDmOverlayCollapsed] = useState(false)
  const focusedFanIdRef = useRef<string | null>(null)
  focusedFanIdRef.current = focusedFan?.id ?? null

  const clearDmSuggestionBridge = useCallback(() => {
    setDmSuggestionBridge(null)
  }, [])

  const closeDmOverlay = useCallback(() => {
    setDmOverlayFanId(null)
    setDmOverlayCollapsed(false)
  }, [])

  const applyDivineUiActionsWithBridge = useCallback(
    (actions: DivineUiAction[] | undefined) => {
      applyDivineUiActionsBase(actions, router, setFocusedFan, {
        onShowDmReplySuggestions: (payload) => setDmSuggestionBridge(payload),
        onFocusFanOverlay: (fanId) => {
          setDmOverlayFanId(fanId)
          setDmOverlayCollapsed(false)
        },
        currentFocusedFanId: focusedFanIdRef.current,
      })
    },
    [router],
  )

  /** When voice async scan + barrier tasks complete, return to Messages with DM suggestions. */
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
  }, [chatInput, chatMessages, chatLoading, focusedFan, router, applyDivineUiActionsWithBridge])

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
    dmOverlayFanId,
    dmOverlayCollapsed,
    setDmOverlayCollapsed,
    closeDmOverlay,
  }

  return (
    <DivinePanelContext.Provider value={value}>
      {children}
    </DivinePanelContext.Provider>
  )
}
