'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  getSettings,
  upsertSettings,
  getTasks,
  updateTask,
  DIVINE_VOICES,
  getDivineVoice,
  type DivineManagerSettingsRow,
  type DivineManagerMode,
  type DivineManagerPersona,
  type DivineManagerGoals,
  type DivineManagerAutomationRules,
  type DivineManagerTaskRow,
} from '@/lib/divine-manager'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Crown, Loader2, ChevronRight, ChevronLeft, Check, Sparkles, Pause, Settings2, ThumbsUp, X, Pencil, Mic, PhoneOff, ImagePlus, Hourglass } from 'lucide-react'
import { useDivinePanel } from '@/components/divine/divine-panel-context'
import { useVoiceSession } from '@/components/divine/voice-session-context'
import { DivineReplyDialog } from '@/components/divine/divine-reply-dialog'
import { MimicTestWizard } from '@/components/divine/mimic-test-wizard'

type WizardStep = 1 | 2 | 3 | 4

const MODE_LABELS: Record<DivineManagerMode, string> = {
  off: 'Off',
  suggest_only: 'Suggest only',
  semi_auto: 'Semi-automatic',
}

export default function DivineManagerPage() {
  const panelCtx = useDivinePanel()
  const voiceSession = useVoiceSession()
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<DivineManagerSettingsRow | null>(null)
  const [tasks, setTasks] = useState<DivineManagerTaskRow[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [wizardStep, setWizardStep] = useState<WizardStep>(1)
  const [saving, setSaving] = useState(false)
  const [runningBrain, setRunningBrain] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingPayload, setEditingPayload] = useState<{ suggestedText?: string } | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  // Wizard form state
  const [persona, setPersona] = useState<DivineManagerPersona>({
    tone: 'friendly',
    flirtyLevel: 'mild',
    boundaries: [],
    examplePhrases: [],
  })
  const [boundaryInput, setBoundaryInput] = useState('')
  const [goals, setGoals] = useState<DivineManagerGoals>({
    qualitativeGoals: [],
    targetSubscribers: undefined,
    targetRetention: undefined,
    targetARPU: undefined,
  })
  const [goalInput, setGoalInput] = useState('')
  const [automationRules, setAutomationRules] = useState<DivineManagerAutomationRules>({
    autoPostSchedule: { enabled: false, maxPerDay: 2 },
    autoWelcomeDm: { enabled: false, maxPerDay: 50 },
    autoFollowUpAfterTips: { enabled: false, maxPerDay: 20 },
    voice_auto: { mass_dm: false, pricing_changes: false, content_publish: false },
    alerts: {
      tasks_for_whale_tips: true,
      whale_tip_min_dollars: 100,
      dmca_draft_requires_confirmation: true,
    },
    jobs: { vault_resale_enabled: false, mass_dm_batch_enabled: false },
  })
  const [selectedMode, setSelectedMode] = useState<DivineManagerMode>('suggest_only')
  const [managerArchetype, setManagerArchetype] = useState<string>('hermes')
  const [notifyLevel, setNotifyLevel] = useState<'none' | 'only_issues' | 'daily_digest' | 'all'>('daily_digest')
  const [betaAcknowledged, setBetaAcknowledged] = useState(false)
  const [voiceScript, setVoiceScript] = useState<string | null>(null)
  const [voiceMode, setVoiceMode] = useState<'intro' | 'ongoing' | 'what_next' | null>(null)
  const [voiceLoading, setVoiceLoading] = useState(false)
  const [ongoingCoachEnabled, setOngoingCoachEnabled] = useState(false)
  const [introBriefingPlayed, setIntroBriefingPlayed] = useState(false)
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [resetting, setResetting] = useState(false)
  const realtimeStatus = voiceSession?.status ?? 'idle'
  const closingPending = voiceSession?.closingPending ?? false
  const realtimeError = voiceSession?.error ?? null
  const remoteVoiceStream = voiceSession?.remoteVoiceStream ?? null
  const voiceVizRef = voiceSession?.voiceVizRef ?? useRef<HTMLCanvasElement | null>(null)
  const userVoiceVizRef = voiceSession?.userVoiceVizRef ?? useRef<HTMLCanvasElement | null>(null)
  const [intentLog, setIntentLog] = useState<{ id: string; intent_type: string; status: string; result_summary?: string; created_at: string }[]>([])
  const [intentLogLoading, setIntentLogLoading] = useState(false)
  const [pendingIntentId, setPendingIntentId] = useState<string | null>(null)
  const [pendingIntentSummary, setPendingIntentSummary] = useState<string | null>(null)
  const [confirmingIntent, setConfirmingIntent] = useState(false)
  const [intentInProgress, setIntentInProgress] = useState(false)
  const [sessionPhotoDataUrl, setSessionPhotoDataUrl] = useState<string | null>(null)
  const sessionPhotoRef = useRef<string | null>(null)
  const [lastAIToolResult, setLastAIToolResult] = useState<string | null>(null)
  const [lastToolName, setLastToolName] = useState<string | null>(null)
  const [lastToolResult, setLastToolResult] = useState<Record<string, unknown> | null>(null)
  const [captionSuggestion, setCaptionSuggestion] = useState<string>('')
  const [captionHashtags, setCaptionHashtags] = useState<string>('')
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeAfterActionRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetIdleRef = useRef<(() => void) | null>(null)
  const [replyDialogOpen, setReplyDialogOpen] = useState(false)
  const [replyContext, setReplyContext] = useState<{
    fan: { id: string; username?: string | null; name?: string | null }
    circeSuggestions: string[]
    venusSuggestions: string[]
    flirtSuggestions: string[]
    recommendation?: 'circe' | 'venus' | 'flirt' | null
    recommendationReason?: string | null
  } | null>(null)

  useEffect(() => {
    sessionPhotoRef.current = sessionPhotoDataUrl
  }, [sessionPhotoDataUrl])

  useEffect(() => {
    if (typeof window === 'undefined') return
    setIntroBriefingPlayed(window.localStorage.getItem('divine_intro_briefing_played') === '1')
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      try {
        const s = await getSettings(supabase, user.id)
        setSettings(s ?? null)
        if (s) {
          setPersona(s.persona ?? {})
          setGoals(s.goals ?? {})
          const merged = (s.automation_rules ?? {}) as DivineManagerAutomationRules
          setAutomationRules({
            autoPostSchedule: { enabled: false, maxPerDay: 2, ...merged.autoPostSchedule },
            autoWelcomeDm: { enabled: false, maxPerDay: 50, ...merged.autoWelcomeDm },
            autoFollowUpAfterTips: { enabled: false, maxPerDay: 20, ...merged.autoFollowUpAfterTips },
            voice_auto: {
              mass_dm: false,
              pricing_changes: false,
              content_publish: false,
              ...merged.voice_auto,
            },
            alerts: {
              tasks_for_whale_tips: true,
              whale_tip_min_dollars: 100,
              dmca_draft_requires_confirmation: true,
              ...merged.alerts,
            },
            jobs: {
              vault_resale_enabled: false,
              mass_dm_batch_enabled: false,
              ...merged.jobs,
            },
          })
          setSelectedMode(s.mode)
          setManagerArchetype(s.manager_archetype || 'hermes')
          if (s.notification_settings?.level) {
            setNotifyLevel(s.notification_settings.level as any)
          }
          if (typeof s.beta_acknowledged === 'boolean') {
            setBetaAcknowledged(s.beta_acknowledged)
          }
          const t = await getTasks(supabase, user.id, { limit: 20 })
          setTasks(t)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleCompleteWizard = async () => {
    if (!userId) return
    setSaving(true)
    try {
      const supabase = createClient()
      const row = await upsertSettings(supabase, userId, {
        persona,
        goals,
        automation_rules: automationRules,
        manager_archetype: managerArchetype,
        notification_settings: { ...(settings?.notification_settings ?? {}), level: notifyLevel, channel: 'in_app' },
        beta_acknowledged: betaAcknowledged,
        mode: selectedMode,
      })
      setSettings(row)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateMode = async (mode: DivineManagerMode) => {
    if (!userId) return
    try {
      const supabase = createClient()
      const row = await upsertSettings(supabase, userId, { mode })
      setSettings(row)
    } catch (e) {
      console.error(e)
    }
  }

  const persistAutomationRules = async (next: DivineManagerAutomationRules) => {
    if (!userId) return
    setAutomationRules(next)
    try {
      const supabase = createClient()
      const row = await upsertSettings(supabase, userId, { automation_rules: next })
      setSettings(row)
    } catch (e) {
      console.error(e)
    }
  }

  const handleRunManager = async () => {
    if (!userId) return
    setRunningBrain(true)
    try {
      const res = await fetch('/api/ai/divine-manager', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to run manager')
      const supabase = createClient()
      const updated = await getTasks(supabase, userId, { limit: 20 })
      setTasks(updated)
    } catch (e) {
      console.error(e)
    } finally {
      setRunningBrain(false)
    }
  }

  const refreshTasks = async () => {
    if (!userId) return
    const supabase = createClient()
    const updated = await getTasks(supabase, userId, { limit: 20 })
    setTasks(updated)
  }

  const handleApprove = async (t: DivineManagerTaskRow) => {
    if (actionLoadingId) return
    setActionLoadingId(t.id)
    try {
      const supabase = createClient()
      const updates: { status: 'executed'; payload?: Record<string, unknown> } = { status: 'executed' }
      if (editingPayload && Object.keys(editingPayload).length > 0) {
        updates.payload = { ...(t.payload ?? {}), ...editingPayload }
      }
      await updateTask(supabase, t.id, updates)
      setEditingTaskId(null)
      setEditingPayload(null)
      await refreshTasks()
    } catch (e) {
      console.error(e)
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDismiss = async (t: DivineManagerTaskRow) => {
    if (actionLoadingId) return
    setActionLoadingId(t.id)
    try {
      const supabase = createClient()
      await updateTask(supabase, t.id, { status: 'skipped' })
      setEditingTaskId(null)
      setEditingPayload(null)
      await refreshTasks()
    } catch (e) {
      console.error(e)
    } finally {
      setActionLoadingId(null)
    }
  }

  const speak = (text: string) => {
    if (typeof window === 'undefined') return
    if (!('speechSynthesis' in window)) {
      // eslint-disable-next-line no-console
      console.warn('Speech synthesis not supported in this browser')
      return
    }
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1
    utterance.pitch = 1
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  const runVoiceMode = async (mode: 'intro' | 'ongoing' | 'what_next') => {
    setVoiceLoading(true)
    setVoiceMode(mode)
    if (mode === 'intro' && typeof window !== 'undefined') {
      window.localStorage.setItem('divine_intro_briefing_played', '1')
      setIntroBriefingPlayed(true)
    }
    try {
      // When the live Realtime voice session is connected, use realtime
      // improvisation instead of generating a static TTS briefing.
      if (voiceSession?.status === 'connected' && (mode === 'intro' || mode === 'what_next')) {
        const prompt =
          mode === 'intro'
            ? 'Divine, answer me like you are talking to a real creator. Who are you and what do you do as the Divine Manager? Reply naturally (no script reading). Do NOT call any tools or take any actions. End by asking: "What do you want me to do next?"'
            : 'Divine, talk to me like we are having a natural conversation. What can you do for me right now as Divine Manager? Recommend the next best thing to do today (keep it short and practical). Do NOT call any tools or take any actions. End by asking: "Anything else you want me to handle right now?"'

        await voiceSession.sendBriefingQuestion(prompt)
        return
      }

      const res = await fetch('/api/ai/divine-manager-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      })
      if (!res.ok) throw new Error('Failed to get voice script')
      const data = (await res.json()) as { script?: string; audio?: string; error?: string }
      if (data.script) setVoiceScript(data.script)
      if (data.audio) {
        const binary = atob(data.audio)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        const blob = new Blob([bytes], { type: 'audio/mpeg' })
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audio.onended = () => URL.revokeObjectURL(url)
        audio.onerror = () => URL.revokeObjectURL(url)
        await audio.play()
      } else if (data.script) {
        speak(data.script)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setVoiceLoading(false)
    }
  }

  const handleResetDivineManager = async () => {
    if (!userId || resetting) return
    const confirmed = typeof window !== 'undefined'
      ? window.confirm('Reset Divine Manager? This will clear its settings and tasks and reopen the setup wizard.')
      : false
    if (!confirmed) return
    setResetting(true)
    try {
      const supabase = createClient()
      await supabase.from('divine_manager_tasks').delete().eq('user_id', userId)
      await supabase.from('divine_manager_settings').delete().eq('user_id', userId)
      setSettings(null)
      setTasks([])
      setWizardStep(1)
      setPersona({
        tone: 'friendly',
        flirtyLevel: 'mild',
        boundaries: [],
        examplePhrases: [],
      })
      setGoals({
        qualitativeGoals: [],
        targetSubscribers: undefined,
        targetRetention: undefined,
        targetARPU: undefined,
      })
      setAutomationRules({
        autoPostSchedule: { enabled: false, maxPerDay: 2 },
        autoWelcomeDm: { enabled: false, maxPerDay: 50 },
        autoFollowUpAfterTips: { enabled: false, maxPerDay: 20 },
        voice_auto: { mass_dm: false, pricing_changes: false, content_publish: false },
        alerts: {
          tasks_for_whale_tips: true,
          whale_tip_min_dollars: 100,
          dmca_draft_requires_confirmation: true,
        },
        jobs: { vault_resale_enabled: false, mass_dm_batch_enabled: false },
      })
      setSelectedMode('suggest_only')
      setManagerArchetype('hermes')
      setNotifyLevel('daily_digest')
      setBetaAcknowledged(false)
      setVoiceScript(null)
      if (panelCtx) panelCtx.setChatMessages([])
      else setChatMessages([])
    } catch (e) {
      console.error(e)
    } finally {
      setResetting(false)
    }
  }

  const sendChat = async () => {
    const trimmed = chatInput.trim()
    if (!trimmed || chatLoading) return
    const nextMessages = [...chatMessages, { role: 'user' as const, content: trimmed }]
    setChatMessages(nextMessages)
    setChatInput('')
    setChatLoading(true)
    try {
      const res = await fetch('/api/ai/divine-manager-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      if (!res.ok) throw new Error('Chat request failed')
      const data = (await res.json()) as { reply?: string; error?: string }
      if (data.reply) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply! }])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setChatLoading(false)
    }
  }

  const startRealtimeVoice = async () => {
    if (voiceSession) {
      await voiceSession.startVoiceCall()
      return
    }
    if (realtimeStatus === 'connecting' || realtimeStatus === 'connected') return
    setRealtimeError(null)
    setLastAIToolResult(null)
    setLastToolName(null)
    setLastToolResult(null)
    setRealtimeStatus('connecting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      realtimeStreamRef.current = stream
      const pc = new RTCPeerConnection()
      realtimePcRef.current = pc

      const audioEl = document.createElement('audio')
      audioEl.autoplay = true
      audioEl.setAttribute('playsinline', 'true')
      realtimeAudioRef.current = audioEl
      pc.ontrack = (e) => {
        if (e.streams[0]) {
          audioEl.srcObject = e.streams[0]
          setRemoteVoiceStream(e.streams[0])
        }
      }

      stream.getTracks().forEach((track) => pc.addTrack(track, stream))
      const dc = pc.createDataChannel('oai-events')
      dc.onmessage = async (event) => {
        resetIdleRef.current?.()
        try {
          const payload = JSON.parse(event.data as string) as {
            type?: string
            tool_calls?: Array<{ name?: string; arguments?: string }>
            response?: { output?: Array<{ type?: string; name?: string; arguments?: string }> }
          }
          const runTool = async (name: string, args: Record<string, unknown>) => {
            if (!name) return
            if (name === 'end_call') {
              // Don't end immediately; give the assistant a moment to finish speaking
              // (especially the "anything else?" question) before we close the session.
              if (closeAfterActionRef.current) clearTimeout(closeAfterActionRef.current)
              closeAfterActionRef.current = setTimeout(() => endRealtimeVoice(), 2000)
              return
            }
            if (name === 'analyze_content' || name === 'generate_caption' || name === 'predict_viral' || name === 'get_retention_insights' || name === 'get_whale_advice') {
              runAITool(name, args)
            } else if (name === 'get_dm_conversations' || name === 'get_dm_thread' || name === 'get_reply_suggestions' || name === 'list_content') {
              // When tools are invoked via tool_calls without a response output item id,
              // we still run them for side-effects/UI but do not send a function_call_output
              // back to the model (no call_id to attach to).
              void runDivineDataTool(name, args)
            } else if (name === 'content_publish' && sessionPhotoRef.current) {
              const platforms = (Array.isArray(args.platforms) ? args.platforms : args.platform ? [args.platform] : ['onlyfans', 'fansly']) as string[]
              const params = { ...args, platforms }
              if (platforms.includes('onlyfans')) {
                try {
                  const res = await fetch(sessionPhotoRef.current)
                  const blob = await res.blob()
                  const file = new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' })
                  const form = new FormData()
                  form.append('file', file)
                  const up = await fetch('/api/onlyfans/media/upload', { method: 'POST', body: form })
                  const data = (await up.json()) as { id?: string; error?: string }
                  if (data.id) params.mediaIds = [data.id]
                } catch {
                  // continue without media
                }
              }
              runDivineIntent(name, params)
            } else {
              runDivineIntent(name, args)
            }
          }
          // Format 1: direct tool_calls array
          const toolCalls =
            payload?.tool_calls ??
            (payload as { tool_calls?: Array<{ name?: string; arguments?: string }> })?.tool_calls
          if (Array.isArray(toolCalls) && toolCalls.length > 0) {
            for (const tc of toolCalls) {
              const name = tc.name
              const args =
                typeof tc.arguments === 'string'
                  ? (() => {
                      try {
                        return JSON.parse(tc.arguments!)
                      } catch {
                        return {}
                      }
                    })()
                  : (tc.arguments ?? {}) as Record<string, unknown>
              await runTool(name!, args)
            }
            return
          }
          // Format 2: response.done with output items of type function_call
          if (payload?.type === 'response.done' && Array.isArray(payload.response?.output)) {
            for (const item of payload.response.output) {
              if (item?.type === 'function_call' && item.name) {
                const args =
                  typeof item.arguments === 'string'
                    ? (() => {
                        try {
                          return JSON.parse(item.arguments!)
                        } catch {
                          return {}
                        }
                      })()
                    : {}
                if (
                  item.name === 'get_dm_conversations' ||
                  item.name === 'get_dm_thread' ||
                  item.name === 'get_reply_suggestions' ||
                  item.name === 'list_content'
                ) {
                  const summary = await runDivineDataTool(
                    item.name,
                    args as Record<string, unknown>,
                  )
                  if (summary) {
                    const eventPayload = {
                      type: 'conversation.item.create',
                      item: {
                        type: 'function_call_output',
                        call_id: item.id,
                        output: summary,
                      },
                    }
                    dc.send(JSON.stringify(eventPayload))
                  }
                } else {
                  await runTool(item.name, args as Record<string, unknown>)
                }
              }
            }
          }
        } catch {
          // ignore non-JSON or unexpected format
        }
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const res = await fetch('/api/ai/divine-manager-realtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: offer.sdp ?? '',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || `Session failed ${res.status}`)
      }
      const answerSdp = await res.text()
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answerSdp }))
      setRealtimeStatus('connected')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to start voice call'
      setRealtimeError(msg)
      setRealtimeStatus('error')
      endRealtimeVoice()
    }
  }

  const endRealtimeVoice = useCallback(() => {
    if (voiceSession) {
      voiceSession.endVoiceCall()
      return
    }
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current)
      idleTimeoutRef.current = null
    }
    if (closeAfterActionRef.current) {
      clearTimeout(closeAfterActionRef.current)
      closeAfterActionRef.current = null
    }
    resetIdleRef.current = null
  }, [voiceSession])

  const IDLE_MS = 2.5 * 60 * 1000

  useEffect(() => {
    if (realtimeStatus !== 'connected') return
    const resetIdle = () => {
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current)
      idleTimeoutRef.current = setTimeout(() => {
        idleTimeoutRef.current = null
        endRealtimeVoice()
      }, IDLE_MS)
    }
    resetIdleRef.current = resetIdle
    resetIdle()
    return () => {
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current)
      idleTimeoutRef.current = null
      resetIdleRef.current = null
    }
  }, [realtimeStatus, endRealtimeVoice])

  const fetchIntentLog = async () => {
    if (!userId) return
    setIntentLogLoading(true)
    try {
      const res = await fetch('/api/divine/intent?limit=10')
      if (res.ok) {
        const data = (await res.json()) as { intents?: { id: string; intent_type: string; status: string; result_summary?: string; created_at: string }[] }
        setIntentLog(data.intents ?? [])
      }
    } catch {
      // ignore
    } finally {
      setIntentLogLoading(false)
    }
  }

  useEffect(() => {
    if (userId && settings?.beta_acknowledged) fetchIntentLog()
  }, [userId, settings?.beta_acknowledged])

  const handleConfirmPendingIntent = async () => {
    if (!pendingIntentId) return
    setConfirmingIntent(true)
    try {
      const res = await fetch('/api/divine/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent_id: pendingIntentId, confirm: true }),
      })
      const data = (await res.json()) as { status?: string; summary?: string; error?: string }
      if (data.status === 'executed' || data.status === 'already_handled') {
        setPendingIntentId(null)
        setPendingIntentSummary(null)
        await fetchIntentLog()
      }
      if (data.error && res.ok === false) {
        console.error(data.error)
      }
    } finally {
      setConfirmingIntent(false)
    }
  }

  const handleCancelPendingIntent = () => {
    setPendingIntentId(null)
    setPendingIntentSummary(null)
  }

  /** Run DM/content context tools (get_dm_conversations, get_dm_thread, get_reply_suggestions, list_content). Fetches from Divine APIs and shows result in tool panel, and returns a short summary string suitable for feeding back into the Realtime model. */
  const runDivineDataTool = async (
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<string | null> => {
    setIntentInProgress(true)
    setLastAIToolResult(null)
    setLastToolName(null)
    setLastToolResult(null)
    try {
      if (toolName === 'get_dm_conversations') {
        const limit = typeof args.limit === 'number' ? args.limit : 20
        const queryParam =
          typeof args.query === 'string' && args.query.trim().length
            ? `&query=${encodeURIComponent(args.query.trim())}`
            : ''
        const res = await fetch(`/api/divine/dm-conversations?limit=${limit}${queryParam}`)
        const data = await res.json().catch(() => ({}))
        if ((data as { error?: string }).error && !res.ok) {
          const msg = (data as { error?: string }).error
          setLastAIToolResult(msg)
          return msg ? `Error loading conversations: ${msg}` : 'Failed to load conversations.'
        }
        setLastToolName(toolName)
        setLastToolResult(data)
        const conversations = (data as { conversations?: any[] }).conversations ?? []
        setLastAIToolResult(`${conversations.length} conversations loaded.`)
        const preview = conversations.slice(0, 5).map((c) => {
          const username = c?.username ?? 'unknown'
          const name = c?.name ?? null
          const fanId = c?.fanId ?? c?.id ?? 'unknown'
          const unread = c?.unreadCount ?? 0
          const label = name ? `${name} (@${username})` : `@${username}`
          return `${label} id=${fanId} unread=${unread}`
        })
        const suffix = preview.length ? ` Top: ${preview.join('; ')}.` : ''
        return `Loaded ${conversations.length} DM conversations.${suffix}`
      } else if (toolName === 'get_dm_thread') {
        const fanId = args.fanId
        if (!fanId) {
          setLastAIToolResult('fanId required')
          return 'fanId required for get_dm_thread.'
        }
        const res = await fetch('/api/divine/dm-thread', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fanId }) })
        const data = await res.json().catch(() => ({}))
        if ((data as { error?: string }).error && !res.ok) {
          const msg = (data as { error?: string }).error
          setLastAIToolResult(msg)
          return msg ? `Error loading thread: ${msg}` : 'Failed to load thread.'
        }
        setLastToolName(toolName)
        setLastToolResult(data)
        const thread = (data as { thread?: any[] }).thread ?? []
        setLastAIToolResult(`Thread: ${thread.length} messages.`)
        const last = thread[thread.length - 1]
        const lastSnippet =
          last && last.text ? ` Last message: ${String(last.text).slice(0, 120)}` : ''
        return `Loaded DM thread with ${thread.length} messages.${lastSnippet}`
      } else if (toolName === 'get_reply_suggestions') {
        const fanId = args.fanId
        if (!fanId) {
          setLastAIToolResult('fanId required')
          return 'fanId required for get_reply_suggestions.'
        }
        const res = await fetch('/api/divine/dm-reply-suggestions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fanId }) })
        const data = await res.json().catch(() => ({}))
        if ((data as { error?: string }).error && !res.ok) {
          const msg = (data as { error?: string }).error
          setLastAIToolResult(msg)
          return msg
            ? `Error loading reply suggestions: ${msg}`
            : 'Failed to load reply suggestions.'
        }
        setLastToolName(toolName)
        setLastToolResult(data)
        const rec = (data as { recommendation?: 'circe' | 'venus' | 'flirt' | null }).recommendation
        const recReason = (data as { recommendationReason?: string | null }).recommendationReason
        const fan = (data as { fan?: { id: string; username?: string | null; name?: string | null } }).fan
        const circeSuggestions = (data as { circeSuggestions?: string[] }).circeSuggestions ?? []
        const venusSuggestions = (data as { venusSuggestions?: string[] }).venusSuggestions ?? []
        const flirtSuggestions = (data as { flirtSuggestions?: string[] }).flirtSuggestions ?? []

        // Emit a \"dm_reply_ready\"-style event into local state so UI can open the reply dialog
        if (fan && (circeSuggestions.length || venusSuggestions.length || flirtSuggestions.length)) {
          setReplyContext({
            fan: {
              id: String(fan.id),
              username: fan.username ?? null,
              name: fan.name ?? null,
            },
            circeSuggestions,
            venusSuggestions,
            flirtSuggestions,
            recommendation: rec ?? null,
            recommendationReason: recReason ?? null,
          })
          setReplyDialogOpen(true)
          // Also focus this fan in the Divine panel if available
          if (panelCtx) {
            panelCtx.setFocusedFan({
              id: String(fan.id),
              username: fan.username ?? null,
              name: fan.name ?? null,
            })
          }
        }
        setLastAIToolResult(rec || 'Circe, Venus, and Flirt suggestions ready. Pick one below.')
        const suggestions = (data as { suggestions?: string[] }).suggestions ?? []
        const firstSuggestion =
          suggestions.length > 0 ? ` Suggestion: ${suggestions[0]}` : ''
        const recText = rec ? `Recommendation: ${rec}.` : ''
        return recText || (firstSuggestion ? `Reply suggestion ready.${firstSuggestion}` : 'Reply suggestions ready.')
      } else if (toolName === 'list_content') {
        const limit = typeof args.limit === 'number' ? args.limit : 20
        const status = typeof args.status === 'string' ? args.status : ''
        const q = new URLSearchParams({ limit: String(limit) })
        if (status) q.set('status', status)
        const res = await fetch(`/api/divine/content-list?${q}`)
        const data = await res.json().catch(() => ({}))
        if ((data as { error?: string }).error && !res.ok) {
          const msg = (data as { error?: string }).error
          setLastAIToolResult(msg)
          return msg ? `Error loading content list: ${msg}` : 'Failed to load content list.'
        }
        setLastToolName(toolName)
        setLastToolResult(data)
        const content = (data as { content?: any[] }).content ?? []
        setLastAIToolResult(`${content.length} content items.`)
        return `Loaded ${content.length} content items.`
      }
      return null
    } catch {
      setLastAIToolResult('Request failed.')
      return 'Request failed.'
    } finally {
      setIntentInProgress(false)
    }
  }

  /** Run an AI Studio tool (analyze_content, generate_caption, predict_viral, get_retention_insights, get_whale_advice). Used so Divine can analyze photo, generate captions, retention/whale advice, etc. from voice only. */
  const runAITool = async (
    toolName: string,
    args: Record<string, unknown>
  ): Promise<void> => {
    const toolIdMap: Record<string, string> = {
      analyze_content: 'standard-of-attraction',
      generate_caption: 'caption-generator',
      predict_viral: 'viral-predictor',
      get_retention_insights: 'churn-predictor',
      get_whale_advice: 'whale-whisperer',
    }
    const toolId = toolIdMap[toolName]
    if (!toolId) return
    setIntentInProgress(true)
    setLastAIToolResult(null)
    setLastToolName(null)
    setLastToolResult(null)
    try {
      const params = { ...args }
      if (toolName === 'analyze_content' && sessionPhotoRef.current) {
        (params as Record<string, unknown>).image = sessionPhotoRef.current
      }
      const res = await fetch('/api/divine/run-ai-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolId, params }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.result) {
        const r = data.result as Record<string, unknown>
        setLastToolName(toolName)
        setLastToolResult(r)
        if (typeof r.score === 'number') {
          setLastAIToolResult(`Score ${r.score}/10. ${String(r.verdict ?? '').slice(0, 120)}`)
        } else if (r.captions && Array.isArray(r.captions)) {
          const first = (r.captions as { text?: string; hashtags?: string[] }[])[0]
          if (first?.text) {
            setCaptionSuggestion(first.text)
          }
          if (first?.hashtags && Array.isArray(first.hashtags)) {
            setCaptionHashtags((first.hashtags as string[]).join(' '))
          }
          setLastAIToolResult('Caption ready in suggestion box.')
        } else if (typeof r.viralScore === 'number') {
          setLastAIToolResult(`Viral score ${r.viralScore}/100. ${String(r.content ?? '').slice(0, 100)}`)
        } else if (typeof r.content === 'string') {
          setLastAIToolResult(r.content.slice(0, 400))
        } else {
          setLastAIToolResult(JSON.stringify(r).slice(0, 200))
        }
      }
    } catch {
      setLastAIToolResult('Tool failed.')
    } finally {
      setIntentInProgress(false)
    }
  }

  /** Call the intent API; if response is requires_confirmation, sets pending state. Returns the API response. */
  const runDivineIntent = async (
    intentType: string,
    params: Record<string, unknown>
  ): Promise<{ status: string; intent_id?: string; summary?: string; message?: string }> => {
    resetIdleRef.current?.()
    setIntentInProgress(true)
    try {
      // Keep intent type (e.g. create_task) distinct from tool params (e.g. task subtype in payload)
      const body =
        intentType === 'create_task'
          ? {
              type: 'create_task',
              summary: (params.summary as string) ?? '',
              payload: { type: (params.type as string) || 'content_idea' },
            }
          : { type: intentType, ...params }
      const res = await fetch('/api/divine/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = (await res.json()) as {
        status?: string
        intent_id?: string
        message?: string
        summary?: string
      }
      if (data.status === 'requires_confirmation' && data.intent_id) {
        setPendingIntentId(data.intent_id)
        setPendingIntentSummary(data.message ?? data.summary ?? 'Confirm this action.')
      }
      if (data.status === 'executed') {
        fetchIntentLog()
        if (closeAfterActionRef.current) clearTimeout(closeAfterActionRef.current)
        // Do not auto-close after actions; the model should ask if the user wants
        // anything else before calling `end_call`. Auto-closing here can cut off
        // the final spoken question.
      }
      return data as { status: string; intent_id?: string; summary?: string; message?: string }
    } finally {
      setIntentInProgress(false)
    }
  }

  if (loading) {
    return (
      <div className="divine-page-bg flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading your Divine Manager…</p>
      </div>
    )
  }

  // First-run wizard: no settings row yet
  if (!settings) {
    return (
      <div className="divine-page-bg min-h-full">
        <div className="divine-fade-in max-w-3xl mx-auto space-y-8 pb-12 px-4 pt-2">
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight flex items-center gap-2">
              <Crown className="h-8 w-8 text-primary divine-shine" />
              Set up your Divine Manager
            </h1>
            <p className="text-muted-foreground mt-2">
              Four steps to a manager that speaks your brand.
            </p>
          </div>

          <Card className="divine-card">
          <CardHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2" role="group" aria-label="Setup progress">
                {([1, 2, 3, 4] as const).map((step) => (
                  <div key={step} className="flex flex-1 items-center last:flex-none">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors ${
                        wizardStep > step
                          ? 'border-primary bg-primary text-primary-foreground'
                          : wizardStep === step
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-muted-foreground/30 bg-transparent text-muted-foreground'
                      }`}
                    >
                      {wizardStep > step ? <Check className="h-4 w-4" /> : step}
                    </div>
                    {step < 4 && <div className="mx-1 h-0.5 flex-1 bg-border" />}
                  </div>
                ))}
              </div>
              <CardDescription className="text-sm">
                {wizardStep === 1 && 'Persona & boundaries'}
                {wizardStep === 2 && 'Archetype & notifications'}
                {wizardStep === 3 && 'Automation rules'}
                {wizardStep === 4 && 'Review and activate'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {wizardStep === 1 && (
              <>
                <div className="space-y-2">
                  <Label>How do you talk to fans?</Label>
                  <Select value={persona.tone ?? 'friendly'} onValueChange={(v) => setPersona((p) => ({ ...p, tone: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="friendly">Friendly & warm</SelectItem>
                      <SelectItem value="playful">Playful & teasing</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual & laid-back</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Comfort level with flirty tone</Label>
                  <Select value={persona.flirtyLevel ?? 'mild'} onValueChange={(v) => setPersona((p) => ({ ...p, flirtyLevel: v as DivineManagerPersona['flirtyLevel'] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="mild">Mild</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Off-limits (add one at a time)</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. No explicit content, no politics"
                      value={boundaryInput}
                      onChange={(e) => setBoundaryInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && boundaryInput.trim()) {
                          setPersona((p) => ({ ...p, boundaries: [...(p.boundaries ?? []), boundaryInput.trim()] }))
                          setBoundaryInput('')
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (boundaryInput.trim()) {
                          setPersona((p) => ({ ...p, boundaries: [...(p.boundaries ?? []), boundaryInput.trim()] }))
                          setBoundaryInput('')
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  {(persona.boundaries?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(persona.boundaries ?? []).map((b, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {b}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {wizardStep === 2 && (
              <>
                <p className="text-sm text-muted-foreground">
                  Choose your Divine Manager&apos;s style and how often it should ping you.
                </p>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Manager archetype</Label>
                    <Select value={managerArchetype} onValueChange={(v) => setManagerArchetype(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hermes">Hermes – Messages & money focus</SelectItem>
                        <SelectItem value="hephaestus">Hephaestus – Systems & schedules</SelectItem>
                        <SelectItem value="hestia">Hestia – Retention & VIP care</SelectItem>
                        <SelectItem value="eros">Eros – Charm & script optimization</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Notification level</Label>
                    <Select value={notifyLevel} onValueChange={(v: any) => setNotifyLevel(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Never notify me</SelectItem>
                        <SelectItem value="only_issues">Only if something breaks or needs approval</SelectItem>
                        <SelectItem value="daily_digest">Daily summary of moves & money</SelectItem>
                        <SelectItem value="all">Notify for every action</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {wizardStep === 3 && (
              <>
                <p className="text-sm text-muted-foreground">
                  Choose what the manager can suggest or do automatically. You can change these later.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">Auto-post schedule</p>
                      <p className="text-xs text-muted-foreground">Suggest or post on a schedule</p>
                    </div>
                    <Switch
                      checked={automationRules.autoPostSchedule?.enabled ?? false}
                      onCheckedChange={(c) =>
                        setAutomationRules((r) => ({
                          ...r,
                          autoPostSchedule: { ...r.autoPostSchedule, enabled: c, maxPerDay: r.autoPostSchedule?.maxPerDay ?? 2 },
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">Auto welcome DMs</p>
                      <p className="text-xs text-muted-foreground">Send welcome message to new subs</p>
                    </div>
                    <Switch
                      checked={automationRules.autoWelcomeDm?.enabled ?? false}
                      onCheckedChange={(c) =>
                        setAutomationRules((r) => ({
                          ...r,
                          autoWelcomeDm: { ...r.autoWelcomeDm, enabled: c, maxPerDay: r.autoWelcomeDm?.maxPerDay ?? 50 },
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">Follow-up after tips</p>
                      <p className="text-xs text-muted-foreground">Thank or follow up after tips</p>
                    </div>
                    <Switch
                      checked={automationRules.autoFollowUpAfterTips?.enabled ?? false}
                      onCheckedChange={(c) =>
                        setAutomationRules((r) => ({
                          ...r,
                          autoFollowUpAfterTips: { ...r.autoFollowUpAfterTips, enabled: c, maxPerDay: r.autoFollowUpAfterTips?.maxPerDay ?? 20 },
                        }))
                      }
                    />
                  </div>
                  <p className="text-sm font-medium text-foreground pt-2">Voice automation</p>
                  <p className="text-xs text-muted-foreground pb-2">When using voice control, choose what Divine can do without asking you to confirm.</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium">Allow auto-send mass DMs</p>
                        <p className="text-xs text-muted-foreground">Divine can send mass messages by voice without confirmation</p>
                      </div>
                      <Switch
                        checked={automationRules.voice_auto?.mass_dm ?? false}
                        onCheckedChange={(c) =>
                          setAutomationRules((r) => ({
                            ...r,
                            voice_auto: { ...r.voice_auto, mass_dm: c },
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium">Allow auto-change prices</p>
                        <p className="text-xs text-muted-foreground">Divine can apply pricing changes by voice without confirmation</p>
                      </div>
                      <Switch
                        checked={automationRules.voice_auto?.pricing_changes ?? false}
                        onCheckedChange={(c) =>
                          setAutomationRules((r) => ({
                            ...r,
                            voice_auto: { ...r.voice_auto, pricing_changes: c },
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium">Allow auto-publish posts</p>
                        <p className="text-xs text-muted-foreground">Divine can publish content by voice without confirmation</p>
                      </div>
                      <Switch
                        checked={automationRules.voice_auto?.content_publish ?? false}
                        onCheckedChange={(c) =>
                          setAutomationRules((r) => ({
                            ...r,
                            voice_auto: { ...r.voice_auto, content_publish: c },
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {wizardStep === 4 && (
              <>
                <p className="font-serif text-sm font-medium text-foreground">Review and activate</p>
                <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-3">
                  <p className="text-sm text-muted-foreground">Tone: {persona.tone} · Flirty: {persona.flirtyLevel}</p>
                  <p className="text-sm text-muted-foreground">Archetype: {managerArchetype}</p>
                  <p className="text-sm text-muted-foreground">
                    Automation: {[automationRules.autoPostSchedule?.enabled && 'Posts', automationRules.autoWelcomeDm?.enabled && 'Welcome DMs', automationRules.autoFollowUpAfterTips?.enabled && 'Tip follow-up'].filter(Boolean).join(', ') || 'None'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Notifications: {notifyLevel === 'none' ? 'Never' : notifyLevel === 'only_issues' ? 'Only issues' : notifyLevel === 'daily_digest' ? 'Daily digest' : 'All actions'}
                  </p>
                  <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                    Divine Manager is <span className="font-semibold">BETA</span>. It can make mistakes. You remain responsible for all actions.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={betaAcknowledged} onCheckedChange={setBetaAcknowledged} />
                  <span className="text-xs text-muted-foreground">
                    I understand this feature is beta and may make mistakes; I remain responsible for all actions.
                  </span>
                </div>
                <div className="space-y-2">
                  <Label>Manager mode</Label>
                  <Select value={selectedMode} onValueChange={(v: DivineManagerMode) => setSelectedMode(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="off">Off — No suggestions or actions</SelectItem>
                      <SelectItem value="suggest_only">Suggest only — Manager suggests; you approve</SelectItem>
                      <SelectItem value="semi_auto">Semi-automatic — Manager can run allowed rules</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" disabled={wizardStep === 1} onClick={() => setWizardStep((s) => (s - 1) as WizardStep)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              {wizardStep < 4 ? (
                <Button onClick={() => setWizardStep((s) => (s + 1) as WizardStep)}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleCompleteWizard} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                  Activate Divine Manager
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    )
  }

  // Console: already set up
  const mode = settings.mode
  const today = new Date().toISOString().slice(0, 10)
  const todayTasks = tasks.filter((t) => t.scheduled_for?.startsWith(today) || (t.status === 'suggested' && !t.scheduled_for))

  return (
    <div className="divine-page-bg min-h-full">
      <div className="divine-fade-in max-w-4xl mx-auto space-y-10 pb-12 px-4 pt-2">
        <div className="mb-10">
          <div className="flex items-center gap-3">
            <Crown className="h-9 w-9 text-primary divine-shine" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-serif text-3xl font-semibold tracking-tight">Divine Manager</h1>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide border-primary/40 text-primary">
                  BETA
                </Badge>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Early access</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Your full-time AI manager orchestrating growth with Circe and Venus.
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Reserved for creators who run the show. Archetype: {settings.manager_archetype || 'hermes'}
              </p>
            </div>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" aria-hidden />

        <MimicTestWizard />

        <Card className="divine-card">
          <CardHeader>
            <CardTitle className="font-serif text-lg">Urgent alerts &amp; jobs</CardTitle>
            <CardDescription>
              Large tips can create Divine tasks. DMCA and sensitive flows default to confirmation-first. Job toggles
              reserve future vault/mass-DM automation (cron uses scheduled tasks).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Tasks for large tips</p>
                <p className="text-xs text-muted-foreground">Create a task when a tip exceeds the minimum (webhook).</p>
              </div>
              <Switch
                checked={automationRules.alerts?.tasks_for_whale_tips !== false}
                onCheckedChange={(c) =>
                  void persistAutomationRules({
                    ...automationRules,
                    alerts: { ...automationRules.alerts, tasks_for_whale_tips: c },
                  })
                }
              />
            </div>
            <div className="space-y-2 max-w-xs">
              <Label>Minimum tip (USD)</Label>
              <Input
                type="number"
                min={1}
                value={automationRules.alerts?.whale_tip_min_dollars ?? 100}
                onChange={(e) => {
                  const v = Math.max(1, Number(e.target.value) || 100)
                  setAutomationRules((r) => ({
                    ...r,
                    alerts: { ...r.alerts, whale_tip_min_dollars: v },
                  }))
                }}
                onBlur={(e) => {
                  const v = Math.max(1, Number(e.target.value) || 100)
                  void persistAutomationRules({
                    ...automationRules,
                    alerts: { ...automationRules.alerts, whale_tip_min_dollars: v },
                  })
                }}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">DMCA drafts require confirmation</p>
                <p className="text-xs text-muted-foreground">Keep auto-filing off unless you explicitly enable per claim.</p>
              </div>
              <Switch
                checked={automationRules.alerts?.dmca_draft_requires_confirmation !== false}
                onCheckedChange={(c) =>
                  void persistAutomationRules({
                    ...automationRules,
                    alerts: { ...automationRules.alerts, dmca_draft_requires_confirmation: c },
                  })
                }
              />
            </div>
            <p className="text-xs font-medium text-foreground pt-1">Planned jobs (stored for semi-auto / cron)</p>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Vault resale campaigns</p>
                <p className="text-xs text-muted-foreground">When wired, creates scheduled tasks for vault pushes.</p>
              </div>
              <Switch
                checked={!!automationRules.jobs?.vault_resale_enabled}
                onCheckedChange={(c) =>
                  void persistAutomationRules({
                    ...automationRules,
                    jobs: { ...automationRules.jobs, vault_resale_enabled: c },
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Mass DM batches</p>
                <p className="text-xs text-muted-foreground">When wired, batches respect platform rate limits.</p>
              </div>
              <Switch
                checked={!!automationRules.jobs?.mass_dm_batch_enabled}
                onCheckedChange={(c) =>
                  void persistAutomationRules({
                    ...automationRules,
                    jobs: { ...automationRules.jobs, mass_dm_batch_enabled: c },
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        {pendingIntentId && (
          <Card className="divine-card border-primary/40 bg-primary/5">
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-foreground">Action requires your confirmation</p>
              <p className="text-xs text-muted-foreground mt-1">{pendingIntentSummary ?? 'Divine wants to run an action. Confirm to proceed.'}</p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={handleConfirmPendingIntent} disabled={confirmingIntent}>
                  {confirmingIntent && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                  Confirm
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelPendingIntent} disabled={confirmingIntent}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5" role="group" aria-label="Manager mode">
            {(['off', 'suggest_only', 'semi_auto'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => handleUpdateMode(m)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === m
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
          {mode !== 'off' && (
            <Button variant="ghost" size="sm" onClick={() => handleUpdateMode('off')}>
              <Pause className="h-4 w-4 mr-1" /> Pause
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            disabled={resetting}
            onClick={handleResetDivineManager}
            className="text-muted-foreground"
          >
            {resetting && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            Reset
          </Button>
        </div>

      <Card className="divine-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="font-serif text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Today&apos;s Plan
              </CardTitle>
              <CardDescription>Curated tasks for today. Run Divine to generate suggestions.</CardDescription>
            </div>
            {mode !== 'off' && (
              <Button variant="outline" size="sm" onClick={handleRunManager} disabled={runningBrain}>
                {runningBrain ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {runningBrain ? 'Divine is running…' : 'Run Divine'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {todayTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Your plan will appear here once the manager runs.
            </p>
          ) : (
            <ul className="space-y-3">
              {todayTasks.slice(0, 10).map((t) => (
                <li key={t.id} className="rounded-lg border border-border/80 pl-4 py-3 pr-3 space-y-2 border-l-4 border-l-primary/50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm capitalize">{t.type.replace(/_/g, ' ')}</p>
                        {t.category && (
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {t.category}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t.source ?? 'Manager'}
                        {t.payload?.segment ? ` · Segment: ${String(t.payload.segment)}` : null}
                      </p>
                      {editingTaskId === t.id ? (
                        <div className="mt-2">
                          <Label className="text-xs">Edit message / details</Label>
                          <Textarea
                            className="mt-1 min-h-[60px] text-sm"
                            value={editingPayload?.suggestedText ?? (t.payload?.suggestedText as string) ?? ''}
                            onChange={(e) => setEditingPayload({ suggestedText: e.target.value })}
                            placeholder="Suggested text..."
                          />
                        </div>
                      ) : (
                        t.payload?.suggestedText && (
                          <p className="text-xs mt-1 line-clamp-2">{String(t.payload.suggestedText)}</p>
                        )
                      )}
                    </div>
                    <Badge variant={t.status === 'executed' ? 'default' : t.status === 'suggested' ? 'secondary' : 'outline'}>
                      {t.status}
                    </Badge>
                  </div>
                  {t.status === 'suggested' && (
                    <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-border">
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs"
                        disabled={actionLoadingId === t.id}
                        onClick={() => handleApprove(t)}
                      >
                        {actionLoadingId === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ThumbsUp className="h-3 w-3" />}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={actionLoadingId === t.id}
                        onClick={() => {
                          if (editingTaskId === t.id) {
                            setEditingTaskId(null)
                            setEditingPayload(null)
                          } else {
                            setEditingTaskId(t.id)
                            setEditingPayload({ suggestedText: (t.payload?.suggestedText as string) ?? '' })
                          }
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                        {editingTaskId === t.id ? 'Cancel edit' : 'Edit'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-muted-foreground"
                        disabled={actionLoadingId === t.id}
                        onClick={() => handleDismiss(t)}
                      >
                        <X className="h-3 w-3" />
                        Dismiss
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {settings.beta_acknowledged && mode !== 'off' && (
        <Card className="divine-card">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="font-serif text-lg flex items-center gap-2">
                  <Mic className="h-5 w-5 text-primary" />
                  Voice Control
                </CardTitle>
                <CardDescription>
                  Live briefings and voice call. Upload a photo, then talk—Divine will analyze, caption, post, and message fans.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px] font-normal">
                  {intentInProgress && 'Executing action'}
                  {!intentInProgress && realtimeStatus === 'connected' && pendingIntentId && 'Needs confirmation'}
                  {!intentInProgress && realtimeStatus === 'idle' && 'Idle'}
                  {!intentInProgress && realtimeStatus === 'connecting' && 'Connecting…'}
                  {!intentInProgress && realtimeStatus === 'connected' && !pendingIntentId && 'Listening'}
                  {!intentInProgress && realtimeStatus === 'error' && 'Error'}
                </Badge>
                <Badge
                  variant="secondary"
                  className="text-[10px] font-normal"
                  title="Voice automation: what Divine can do without confirmation"
                >
                  {settings.automation_rules?.voice_auto?.mass_dm ||
                  settings.automation_rules?.voice_auto?.pricing_changes ||
                  settings.automation_rules?.voice_auto?.content_publish
                    ? (settings.automation_rules?.voice_auto?.mass_dm &&
                        settings.automation_rules?.voice_auto?.pricing_changes &&
                        settings.automation_rules?.voice_auto?.content_publish
                        ? 'Full Auto'
                        : 'Rules')
                    : 'Safe'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {realtimeStatus === 'connected' && !panelCtx?.focusedFan?.id && (
              <p className="text-xs text-amber-800 dark:text-amber-200/90 rounded-md border border-amber-500/35 bg-amber-500/10 px-2 py-1.5">
                For DM thread readouts, open Messages and select a fan (or focus one from Divine chat). Otherwise Divine can
                list conversations by name.
              </p>
            )}
            {!introBriefingPlayed && (
              <p className="text-xs text-muted-foreground rounded-md bg-muted/50 border border-border p-2">
                New to Divine? Play intro briefing to see what you can do, then try What next?
              </p>
            )}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Voice control AI briefings (live).</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={voiceLoading}
                  onClick={() => runVoiceMode('intro')}
                >
                  {voiceLoading && voiceMode === 'intro' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  Play intro briefing
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={voiceLoading}
                  onClick={() => runVoiceMode('what_next')}
                >
                  {voiceLoading && voiceMode === 'what_next' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  What next?
                </Button>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={ongoingCoachEnabled}
                    onCheckedChange={setOngoingCoachEnabled}
                    disabled={voiceLoading}
                  />
                  <span className="text-xs text-muted-foreground">
                    Ongoing coach while this page is open
                  </span>
                </div>
              </div>
              {voiceScript && (
                <div className="rounded-md border border-border bg-muted/40 p-2 text-xs text-muted-foreground max-h-40 overflow-y-auto">
                  {voiceScript}
                </div>
              )}
            </div>
            <div className="rounded-lg border border-dashed border-border p-3 space-y-2">
              <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <ImagePlus className="h-3.5 w-3.5" />
                Photo for Divine (optional)
              </p>
              <p className="text-[11px] text-muted-foreground">
                Upload one photo. Then start the call and say e.g. &quot;rate this&quot;, &quot;write a caption&quot;, or &quot;post this and send to my fans&quot;. Divine handles the rest.
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  type="file"
                  accept="image/*"
                  className="max-w-[200px] text-xs"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = () => {
                      const dataUrl = reader.result as string
                      setSessionPhotoDataUrl(dataUrl)
                    }
                    reader.readAsDataURL(file)
                  }}
                />
                {sessionPhotoDataUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => { setSessionPhotoDataUrl(null); setLastAIToolResult(null); setLastToolName(null); setLastToolResult(null) }}
                  >
                    Clear
                  </Button>
                )}
              </div>
              {sessionPhotoDataUrl && (
                <div className="flex items-center gap-2">
                  <img src={sessionPhotoDataUrl} alt="Session" className="h-14 w-14 rounded object-cover border border-border" />
                  <span className="text-[11px] text-muted-foreground">Photo ready. Start the call and ask Divine to analyze or use it.</span>
                </div>
              )}
            </div>
          {captionSuggestion && (
            <Card className="border-border bg-muted/30">
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-sm font-medium">Caption suggestion</CardTitle>
              </CardHeader>
              <CardContent className="py-2 px-3 space-y-2">
                <p className="text-[11px] text-muted-foreground">
                  Divine&apos;s suggested caption is editable. Changes here will be used when you publish.
                </p>
                <textarea
                  className="w-full min-h-[72px] resize-y rounded-md border border-border bg-background/60 px-2 py-1 text-xs text-foreground"
                  value={captionSuggestion}
                  onChange={(e) => setCaptionSuggestion(e.target.value)}
                />
                {captionHashtags && (
                  <p className="text-[11px] text-muted-foreground break-words">
                    {captionHashtags}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
            {lastToolResult !== null && lastToolName && (
              <Card className="border-border bg-muted/30">
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-sm font-medium">Tool result: {lastToolName.replace(/_/g, ' ')}</CardTitle>
                </CardHeader>
                <CardContent className="py-2 px-3 space-y-3 max-h-64 overflow-y-auto">
                  {lastToolName === 'analyze_content' && (
                    <>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-2xl font-bold text-foreground">
                            {typeof lastToolResult.score === 'number' ? lastToolResult.score : '—'}
                          </span>
                          <span className="text-xs text-muted-foreground">/10</span>
                        </div>
                        {lastToolResult.verdict && (
                          <Badge variant="secondary" className="text-xs font-normal">
                            {String(lastToolResult.verdict)}
                          </Badge>
                        )}
                      </div>
                      {lastToolResult.venusTake && (
                        <p className="text-xs"><span className="font-medium text-foreground">Venus: </span><span className="text-muted-foreground">{String(lastToolResult.venusTake)}</span></p>
                      )}
                      {lastToolResult.circeTake && (
                        <p className="text-xs"><span className="font-medium text-foreground">Circe: </span><span className="text-muted-foreground">{String(lastToolResult.circeTake)}</span></p>
                      )}
                      {Array.isArray(lastToolResult.strengths) && lastToolResult.strengths.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-foreground mb-1">Strengths</p>
                          <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                            {(lastToolResult.strengths as string[]).map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {Array.isArray(lastToolResult.improvements) && lastToolResult.improvements.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-foreground mb-1">Improvements</p>
                          <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                            {(lastToolResult.improvements as string[]).map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                  {lastToolName === 'generate_caption' && (
                    <>
                      {lastToolResult.captions && Array.isArray(lastToolResult.captions) && (
                        <div className="space-y-2">
                          {(lastToolResult.captions as { text?: string; hashtags?: string[] }[]).map((cap, i) => (
                            <div key={i} className="rounded border border-border bg-background/50 p-2 text-xs">
                              {cap.text && <p className="text-foreground whitespace-pre-wrap">{cap.text}</p>}
                              {cap.hashtags && cap.hashtags.length > 0 && (
                                <p className="text-muted-foreground mt-1">{(cap.hashtags as string[]).join(' ')}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {(!lastToolResult.captions || !Array.isArray(lastToolResult.captions)) && (
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{JSON.stringify(lastToolResult)}</p>
                      )}
                    </>
                  )}
                  {lastToolName === 'predict_viral' && (
                    <>
                      {typeof lastToolResult.viralScore === 'number' && (
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-foreground">{lastToolResult.viralScore}</span>
                          <span className="text-xs text-muted-foreground">/100</span>
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min(100, lastToolResult.viralScore)}%` }} />
                          </div>
                        </div>
                      )}
                      {lastToolResult.content && (
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{String(lastToolResult.content)}</p>
                      )}
                    </>
                  )}
                  {(lastToolName === 'get_retention_insights' || lastToolName === 'get_whale_advice') && (
                    <div className="rounded border border-border bg-background/50 p-2 text-xs text-muted-foreground whitespace-pre-wrap">
                      {typeof lastToolResult.content === 'string'
                        ? lastToolResult.content
                        : JSON.stringify(lastToolResult)}
                    </div>
                  )}
                  {lastToolName === 'get_reply_suggestions' && (
                    <>
                      {lastToolResult.recommendation && (
                        <p className="text-xs font-medium text-foreground">
                          Recommendation: {String(lastToolResult.recommendation).toUpperCase()}
                          {lastToolResult.recommendationReason && ` — ${String(lastToolResult.recommendationReason)}`}
                        </p>
                      )}
                      {lastToolResult.scan?.insights?.length > 0 && (
                        <p className="text-xs text-muted-foreground">Scan: {(lastToolResult.scan.insights as string[]).slice(0, 2).join('; ')}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground mb-2">Choose a reply style while Divine reads the proposal (click to copy):</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {['circe', 'venus', 'flirt'].map((persona) => {
                          const key = `${persona}Suggestions` as 'circeSuggestions' | 'venusSuggestions' | 'flirtSuggestions'
                          const suggestions = (lastToolResult[key] as string[] | undefined) ?? []
                          const label = persona === 'circe' ? 'Circe Reply' : persona === 'venus' ? 'Venus Reply' : 'Flirt Reply'
                          const borderClass = persona === 'circe' ? 'border-circe/40' : persona === 'venus' ? 'border-gold/50' : 'border-pink-500/50'
                          const text = suggestions[0] ?? ''
                          return (
                            <Button
                              key={persona}
                              variant="outline"
                              size="sm"
                              className={`text-xs h-auto py-2 flex flex-col items-stretch gap-1 text-left ${borderClass}`}
                              onClick={() => {
                                if (text && navigator.clipboard) navigator.clipboard.writeText(text)
                              }}
                            >
                              <span className="font-medium">{label}</span>
                              {text ? <span className="text-[10px] font-normal text-muted-foreground line-clamp-3">{text}</span> : null}
                            </Button>
                          )
                        })}
                      </div>
                      {lastToolResult.fan && (
                        <a href="/dashboard/messages" target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary hover:underline mt-2 inline-block">Open Messages</a>
                      )}
                    </>
                  )}
                  {lastToolName === 'get_dm_conversations' && (
                    <ul className="space-y-1 text-xs">
                      {(lastToolResult.conversations as Array<{ username: string; fanId: string; name?: string | null; lastMessage?: string; unreadCount?: number }> ?? []).slice(0, 15).map((c, i) => (
                        <li key={i} className="flex justify-between gap-2">
                          <span className="font-medium">{c.name ? `${c.name} (@${c.username})` : `@${c.username}`}</span>
                          {c.unreadCount ? <Badge variant="secondary" className="text-[10px]">{c.unreadCount}</Badge> : null}
                          {c.lastMessage && <span className="text-muted-foreground truncate">{String(c.lastMessage).slice(0, 40)}…</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {lastToolName === 'get_dm_thread' && (
                    <div className="space-y-1 text-xs max-h-48 overflow-y-auto">
                      {(lastToolResult.thread as Array<{ from: string; text: string }> ?? []).map((m, i) => (
                        <div key={i} className={m.from === 'creator' ? 'text-right text-muted-foreground' : 'text-left'}>
                          <span className="font-medium">{m.from}: </span>{m.text.slice(0, 120)}{m.text.length > 120 ? '…' : ''}
                        </div>
                      ))}
                    </div>
                  )}
                  {lastToolName === 'list_content' && (
                    <ul className="space-y-1 text-xs">
                      {(lastToolResult.content as Array<{ title: string; status: string; scheduled_at?: string }> ?? []).map((c, i) => (
                        <li key={i}>[{c.status}] {c.title}{c.scheduled_at ? ` — ${c.scheduled_at}` : ''}</li>
                      ))}
                    </ul>
                  )}
                  {!['analyze_content', 'generate_caption', 'predict_viral', 'get_retention_insights', 'get_whale_advice', 'get_reply_suggestions', 'get_dm_conversations', 'get_dm_thread', 'list_content'].includes(lastToolName) && (
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(lastToolResult, null, 2)}
                    </pre>
                  )}
                </CardContent>
              </Card>
            )}
            {lastAIToolResult && (
              <div className="rounded-md border border-border bg-muted/40 p-2 text-xs text-muted-foreground max-h-24 overflow-y-auto">
                <span className="font-medium text-foreground">Result: </span>
                {lastAIToolResult}
              </div>
            )}
            {realtimeStatus === 'connected' && (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-gradient-to-b from-violet-500/10 to-transparent p-4">
                {(intentInProgress || closingPending) ? (
                  <>
                    <div className="flex flex-col items-center gap-2">
                      <Hourglass className="h-12 w-12 text-violet-500 animate-spin" style={{ animationDuration: '3s' }} />
                      <p className="text-xs text-muted-foreground">
                        {closingPending ? 'Ending call…' : 'Working…'}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-full max-w-[240px] space-y-1.5">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">You</p>
                      <canvas
                        ref={userVoiceVizRef}
                        width={240}
                        height={28}
                        className="h-7 w-full rounded-lg opacity-90 block"
                        style={{ background: 'rgba(0,0,0,0.05)' }}
                      />
                    </div>
                    <div className="w-full max-w-[240px] space-y-1.5">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Divine</p>
                      <canvas
                        ref={voiceVizRef}
                        width={240}
                        height={28}
                        className="h-7 w-full rounded-lg opacity-90 block"
                        style={{ background: 'transparent' }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Listening and speaking…</p>
                  </>
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {realtimeStatus !== 'connected' ? (
                <Button
                  size="sm"
                  variant="default"
                  disabled={realtimeStatus === 'connecting'}
                  onClick={startRealtimeVoice}
                >
                  {realtimeStatus === 'connecting' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Mic className="h-3 w-3" />
                  )}
                  {realtimeStatus === 'connecting' ? 'Connecting…' : 'Start voice call'}
                </Button>
              ) : (
                <Button size="sm" variant="destructive" onClick={endRealtimeVoice}>
                  <PhoneOff className="h-3 w-3" />
                  End call
                </Button>
              )}
            </div>
            {realtimeError && (
              <p className="text-xs text-destructive">{realtimeError}</p>
            )}
            <div className="border-t border-border pt-3">
              <p className="text-xs font-medium text-foreground mb-2">Recent actions</p>
              {intentLogLoading ? (
                <p className="text-xs text-muted-foreground">Loading…</p>
              ) : intentLog.length === 0 ? (
                <p className="text-xs text-muted-foreground">No voice actions yet. Start a call and ask Divine to send a mass DM, get stats, or add a task.</p>
              ) : (
                <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                  {intentLog.map((entry) => (
                    <li key={entry.id} className="flex items-start gap-2 text-xs">
                      <Badge variant={entry.status === 'executed' ? 'default' : entry.status === 'proposed' ? 'secondary' : 'outline'} className="shrink-0 text-[10px]">
                        {entry.status}
                      </Badge>
                      <span className="text-muted-foreground shrink-0">{entry.intent_type.replace(/_/g, ' ')}</span>
                      <span className="text-muted-foreground truncate min-w-0">
                        {entry.result_summary ?? new Date(entry.created_at).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {intentLog.length > 0 && (
                <Button variant="ghost" size="sm" className="mt-1 text-xs h-7" onClick={fetchIntentLog}>
                  Refresh
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {settings.beta_acknowledged && mode !== 'off' && (
        <Card className="divine-card">
          <CardHeader>
            <CardTitle className="font-serif text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Ask Divine
            </CardTitle>
            <CardDescription>
              Same Divine manager in text mode. Ask about your fans, revenue, or which tasks to prioritize.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-48 w-full rounded-md border border-border bg-muted/20 p-2 overflow-y-auto space-y-2 text-sm">
              {(panelCtx ? panelCtx.chatMessages : chatMessages).length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Ask me about your fans, revenue, or which tasks to prioritize. I’ll answer based on your Divine Manager setup and plan. Same chat stays open in the Divine panel when you switch pages.
                </p>
              ) : (
                (panelCtx ? panelCtx.chatMessages : chatMessages).map((m, idx) => (
                  <div
                    key={idx}
                    className={`max-w-[80%] rounded-lg px-2 py-1 ${
                      m.role === 'user'
                        ? 'ml-auto bg-primary text-primary-foreground'
                        : 'mr-auto bg-muted text-foreground'
                    }`}
                  >
                    {m.content}
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Type a question for your manager…"
                value={panelCtx ? panelCtx.chatInput : chatInput}
                onChange={(e) => (panelCtx ? panelCtx.setChatInput(e.target.value) : setChatInput(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    ;(panelCtx ? panelCtx.sendChat : sendChat)()
                  }
                }}
                disabled={panelCtx ? panelCtx.chatLoading : chatLoading}
              />
              <Button size="sm" disabled={(panelCtx ? panelCtx.chatLoading : chatLoading) || !(panelCtx ? panelCtx.chatInput : chatInput).trim()} onClick={panelCtx ? panelCtx.sendChat : sendChat}>
                {(panelCtx ? panelCtx.chatLoading : chatLoading) ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="divine-card">
        <CardHeader>
          <CardTitle className="font-serif text-lg flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Your preferences
          </CardTitle>
          <CardDescription>Persona, goals, and automation. Editable in a future update.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p><span className="font-medium text-foreground">Tone:</span> {String(settings.persona?.tone ?? '—')} · Flirty: {String(settings.persona?.flirtyLevel ?? '—')}</p>
          <p><span className="font-medium text-foreground">Archetype:</span> {settings.manager_archetype || 'hermes'}</p>
          <p><span className="font-medium text-foreground">Notifications:</span> {settings.notification_settings?.level ?? 'daily_digest'}</p>
          <p className="font-medium text-foreground">AI voice</p>
          <Select
            value={getDivineVoice(settings.notification_settings?.voice)}
            onValueChange={async (v) => {
              if (!userId) return
              const supabase = createClient()
              await upsertSettings(supabase, userId, {
                ...settings,
                notification_settings: { ...settings.notification_settings, voice: v },
              })
              const s = await getSettings(supabase, userId)
              if (s) setSettings(s)
            }}
          >
            <SelectTrigger className="max-w-[200px]"><SelectValue placeholder="Marin" /></SelectTrigger>
            <SelectContent>
              {DIVINE_VOICES.map((id) => (
                <SelectItem key={id} value={id}>{id.charAt(0).toUpperCase() + id.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p><span className="font-medium text-foreground">Rules:</span> Auto-post {settings.automation_rules?.autoPostSchedule?.enabled ? 'on' : 'off'}, Welcome DM {settings.automation_rules?.autoWelcomeDm?.enabled ? 'on' : 'off'}, Tip follow-up {settings.automation_rules?.autoFollowUpAfterTips?.enabled ? 'on' : 'off'}</p>
          <p className="font-medium text-foreground pt-2">Voice automation</p>
          <p className="text-xs text-muted-foreground pb-1">What Divine can do by voice without asking you to confirm.</p>
          <div className="flex flex-wrap gap-4 pt-1">
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.automation_rules?.voice_auto?.mass_dm ?? false}
                onCheckedChange={async (c) => {
                  if (!userId) return
                  const supabase = createClient()
                  await upsertSettings(supabase, userId, {
                    ...settings,
                    automation_rules: { ...settings.automation_rules, voice_auto: { ...settings.automation_rules?.voice_auto, mass_dm: c } },
                  })
                  const s = await getSettings(supabase, userId)
                  if (s) setSettings(s)
                }}
              />
              <span className="text-sm">Mass DMs</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.automation_rules?.voice_auto?.pricing_changes ?? false}
                onCheckedChange={async (c) => {
                  if (!userId) return
                  const supabase = createClient()
                  await upsertSettings(supabase, userId, {
                    ...settings,
                    automation_rules: { ...settings.automation_rules, voice_auto: { ...settings.automation_rules?.voice_auto, pricing_changes: c } },
                  })
                  const s = await getSettings(supabase, userId)
                  if (s) setSettings(s)
                }}
              />
              <span className="text-sm">Pricing changes</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.automation_rules?.voice_auto?.content_publish ?? false}
                onCheckedChange={async (c) => {
                  if (!userId) return
                  const supabase = createClient()
                  await upsertSettings(supabase, userId, {
                    ...settings,
                    automation_rules: { ...settings.automation_rules, voice_auto: { ...settings.automation_rules?.voice_auto, content_publish: c } },
                  })
                  const s = await getSettings(supabase, userId)
                  if (s) setSettings(s)
                }}
              />
              <span className="text-sm">Publish posts</span>
            </div>
          </div>
        </CardContent>
      </Card>
      {replyContext && (
        <DivineReplyDialog
          open={replyDialogOpen}
          onOpenChange={setReplyDialogOpen}
          fan={replyContext.fan}
          circeSuggestions={replyContext.circeSuggestions}
          venusSuggestions={replyContext.venusSuggestions}
          flirtSuggestions={replyContext.flirtSuggestions}
          recommendedPersona={replyContext.recommendation}
          recommendationReason={replyContext.recommendationReason ?? null}
        />
      )}
      </div>
    </div>
  )
}
