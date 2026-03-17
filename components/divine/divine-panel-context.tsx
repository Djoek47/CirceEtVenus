'use client'

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

export type FocusedFan = {
  id: string
  username?: string | null
  name?: string | null
}

type DivinePanelContextValue = {
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
  sendChat: () => Promise<void>
  generatedText: string | null
  setGeneratedText: (text: string | null) => void
  generatePrompt: string
  setGeneratePrompt: (value: string) => void
  generateLoading: boolean
  requestGenerate: () => Promise<void>
  copyGenerated: () => void
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
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelCollapsed, setPanelCollapsed] = useState(true)
  const [focusedFan, setFocusedFan] = useState<FocusedFan | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [generatedText, setGeneratedText] = useState<string | null>(null)
  const [generatePrompt, setGeneratePrompt] = useState('')
  const [generateLoading, setGenerateLoading] = useState(false)

  const sendChat = useCallback(async () => {
    const trimmed = chatInput.trim()
    if (!trimmed || chatLoading) return
    const nextMessages: ChatMessage[] = [
      ...chatMessages,
      { role: 'user', content: trimmed },
    ]
    setChatMessages(nextMessages)
    setChatInput('')
    setChatLoading(true)
    try {
      const res = await fetch('/api/ai/divine-manager-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          focusedFan,
        }),
      })
      if (!res.ok) throw new Error('Chat request failed')
      const data = (await res.json()) as { reply?: string; error?: string }
      if (data.reply) {
        setChatMessages((prev) => [...prev, { role: 'assistant', content: data.reply! }])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setChatLoading(false)
    }
  }, [chatInput, chatMessages, chatLoading, focusedFan])

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
    sendChat,
    generatedText,
    setGeneratedText,
    generatePrompt,
    setGeneratePrompt,
    generateLoading,
    requestGenerate,
    copyGenerated,
  }

  return (
    <DivinePanelContext.Provider value={value}>
      {children}
    </DivinePanelContext.Provider>
  )
}
