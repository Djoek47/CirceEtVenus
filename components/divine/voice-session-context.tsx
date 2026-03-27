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
import { useDivinePanel, type FocusedFan } from '@/components/divine/divine-panel-context'
import type { DivineUiAction } from '@/lib/divine/divine-ui-actions'
import type { DivineVoiceDisconnectReason } from '@/lib/divine/voice-memory-types'
import type { VoiceHangupPolicy } from '@/lib/divine-manager'

/** Must stay below `voice-tool` route `maxDuration` so the client fails first with a clear message, not a generic hang. */
const VOICE_TOOL_FETCH_TIMEOUT_MS = 115_000

function summarizeVoiceToolArgs(args: Record<string, unknown>): string {
  try {
    const s = JSON.stringify(args)
    return s.length > 220 ? `${s.slice(0, 220)}…` : s
  } catch {
    return '(args)'
  }
}

type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'error'

/** Purple = tool/model work; gold = assistant speaking; idle = neither. */
export type VoiceSurfaceState = 'idle' | 'working' | 'speaking'

type VoiceSessionContextValue = {
  status: VoiceStatus
  /** Derived from remote audio (speaking) vs in-flight tools (working). */
  voiceSurfaceState: VoiceSurfaceState
  /** True while waiting to hang up after `end_call` (assistant audio + silence gate). */
  closingPending: boolean
  error: string | null
  startVoiceCall: () => Promise<void>
  endVoiceCall: () => void
  /**
   * Inject a text "user message" into the live Realtime conversation, then request
   * an assistant response. Used for the Divine Manager briefing buttons.
   */
  sendBriefingQuestion: (text: string) => Promise<void>
  remoteVoiceStream: MediaStream | null
  localVoiceStream: MediaStream | null
  voiceVizRef: React.RefObject<HTMLCanvasElement>
  userVoiceVizRef: React.RefObject<HTMLCanvasElement>
  focusedFanForVoice: FocusedFan | null
  setFocusedFanForVoice: (fan: FocusedFan | null) => void
  /** From Divine Manager settings; when after_closing_prompt, End is gated until voice_allow_user_hangup runs. */
  voiceHangupPolicy: VoiceHangupPolicy
  /** Model called voice_allow_user_hangup (after asking "anything else?"). */
  userHangupAllowed: boolean
  /** Whether the manual End button should be enabled (not gated). */
  canManualHangup: boolean
  /** End call even when canManualHangup is false (e.g. stuck session). */
  forceEndVoiceCall: () => void
}

const VoiceSessionContext = createContext<VoiceSessionContextValue | null>(null)

export function useVoiceSession(): VoiceSessionContextValue | null {
  return useContext(VoiceSessionContext)
}

export function VoiceSessionProvider({ children }: { children: ReactNode }) {
  const divinePanel = useDivinePanel()
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [remoteVoiceStream, setRemoteVoiceStream] = useState<MediaStream | null>(null)
  const [localVoiceStream, setLocalVoiceStream] = useState<MediaStream | null>(null)
  const voiceVizRef = useRef<HTMLCanvasElement | null>(null)
  const userVoiceVizRef = useRef<HTMLCanvasElement | null>(null)
  const [focusedFanForVoice, setFocusedFanForVoice] = useState<FocusedFan | null>(null)
  const [closingPending, setClosingPending] = useState(false)
  const [voiceHangupPolicy, setVoiceHangupPolicy] = useState<VoiceHangupPolicy>('always')
  const [userHangupAllowed, setUserHangupAllowed] = useState(false)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const oaiDataChannelRef = useRef<RTCDataChannel | null>(null)
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const endCallTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const endCallRafRef = useRef<number | null>(null)
  /** Shared with the remote waveform analyser for silence detection after `end_call`. */
  const remoteAnalyserRef = useRef<AnalyserNode | null>(null)
  const localAnalyserRef = useRef<AnalyserNode | null>(null)
  const toolInFlightRef = useRef(false)
  /** True while assistant TTS/audio energy is above threshold (pauses idle disconnect). */
  const assistantSpeakingRef = useRef(false)
  const prevRemoteLoudRef = useRef(false)
  const idleMsRef = useRef<number | null>(null)
  const lastPendingConfirmationsRef = useRef<
    Array<{ type: string; intent_id: string; summary?: string }>
  >([])
  const scheduleIdleDisconnectRef = useRef<() => void>(() => {})
  const resumeBriefingSentRef = useRef(false)
  const [voiceSurfaceState, setVoiceSurfaceState] = useState<VoiceSurfaceState>('idle')

  useEffect(() => {
    const raw = process.env.NEXT_PUBLIC_DIVINE_VOICE_IDLE_MS
    if (raw === undefined || raw === '') {
      idleMsRef.current = null
      return
    }
    const n = parseInt(raw, 10)
    idleMsRef.current = Number.isNaN(n) || n <= 0 ? null : n
  }, [])

  const playCue = useCallback((kind: 'done' | 'error') => {
    if (typeof window === 'undefined') return
    try {
      const AnyWindow = window as unknown as {
        AudioContext?: typeof AudioContext
        webkitAudioContext?: typeof AudioContext
      }
      const AudioCtx = AnyWindow.AudioContext || AnyWindow.webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const isError = kind === 'error'
      osc.type = 'sine'
      osc.frequency.value = isError ? 440 : 880
      gain.gain.value = 0.05
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.15)
      osc.onended = () => {
        gain.disconnect()
        ctx.close().catch(() => undefined)
      }
    } catch {
      // ignore audio failures
    }
  }, [])

  const cancelIdleTimer = useCallback(() => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current)
      idleTimeoutRef.current = null
    }
  }, [])

  const endVoiceCall = useCallback(
    (reason: DivineVoiceDisconnectReason = 'user_hangup') => {
      const hadToolInFlight = toolInFlightRef.current
      const pendingSnap = [...lastPendingConfirmationsRef.current]
      cancelIdleTimer()
      if (endCallTimeoutRef.current) {
        clearTimeout(endCallTimeoutRef.current)
        endCallTimeoutRef.current = null
      }
      if (endCallRafRef.current != null) {
        cancelAnimationFrame(endCallRafRef.current)
        endCallRafRef.current = null
      }
      setClosingPending(false)
      toolInFlightRef.current = false
      lastPendingConfirmationsRef.current = []
      setVoiceSurfaceState('idle')
      assistantSpeakingRef.current = false
      prevRemoteLoudRef.current = false
      const pc = pcRef.current
      if (pc) {
        pc.close()
        pcRef.current = null
      }
      const stream = streamRef.current
      if (stream) {
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      audioRef.current = null
      setRemoteVoiceStream(null)
      setLocalVoiceStream(null)
      oaiDataChannelRef.current = null
      setStatus('idle')
      setError(null)
      setUserHangupAllowed(false)

      void fetch('/api/divine/voice-memory', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          reason === 'end_call'
            ? { clear: true }
            : {
                disconnect_reason: reason,
                status:
                  hadToolInFlight || pendingSnap.length > 0
                    ? 'in_progress'
                    : 'completed',
                resume_hint:
                  hadToolInFlight || pendingSnap.length > 0
                    ? `Session ended (${reason}). ${pendingSnap.length ? 'Confirmation pending in app.' : 'Task may have been incomplete.'}`
                    : null,
              },
        ),
      }).catch(() => undefined)
    },
    [cancelIdleTimer],
  )

  const scheduleIdleDisconnect = useCallback(() => {
    const ms = idleMsRef.current
    if (ms == null || ms <= 0) return
    cancelIdleTimer()
    if (toolInFlightRef.current || assistantSpeakingRef.current) return
    idleTimeoutRef.current = setTimeout(() => {
      idleTimeoutRef.current = null
      endVoiceCall('idle_timeout')
    }, ms)
  }, [cancelIdleTimer, endVoiceCall])

  useEffect(() => {
    scheduleIdleDisconnectRef.current = scheduleIdleDisconnect
  }, [scheduleIdleDisconnect])

  const cancelIdleTimerRef = useRef<() => void>(() => {})
  useEffect(() => {
    cancelIdleTimerRef.current = cancelIdleTimer
  }, [cancelIdleTimer])

  const sendBriefingQuestion = useCallback(async (text: string) => {
    const dc = oaiDataChannelRef.current
    if (!dc) {
      throw new Error('Voice session is not connected')
    }

    // Inject a user text message into the conversation and ask the model to respond.
    // The session already has the correct instructions/tools configured server-side.
    dc.send(
      JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text }],
        },
      }),
    )

    dc.send(
      JSON.stringify({
        type: 'response.create',
        response: { modalities: ['audio'] },
      }),
    )
    scheduleIdleDisconnectRef.current()
  }, [])

  const refreshVoiceHangupPolicy = useCallback(async () => {
    try {
      const res = await fetch('/api/divine/manager-settings', { credentials: 'include' })
      const json = (await res.json().catch(() => ({}))) as {
        voice_hangup_policy?: VoiceHangupPolicy
      }
      if (json.voice_hangup_policy === 'after_closing_prompt') {
        setVoiceHangupPolicy('after_closing_prompt')
      } else {
        setVoiceHangupPolicy('always')
      }
    } catch {
      setVoiceHangupPolicy('always')
    }
  }, [])

  useEffect(() => {
    void refreshVoiceHangupPolicy()
  }, [refreshVoiceHangupPolicy])

  const startVoiceCall = useCallback(async () => {
    if (status === 'connecting' || status === 'connected') return
    setError(null)
    setUserHangupAllowed(false)
    await refreshVoiceHangupPolicy()
    setStatus('connecting')
    try {
      if (typeof navigator === 'undefined') {
        throw new Error('Navigator not available')
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      setLocalVoiceStream(stream)
      const pc = new RTCPeerConnection()
      pcRef.current = pc

      const audioEl = document.createElement('audio')
      audioEl.autoplay = true
      audioEl.setAttribute('playsinline', 'true')
      audioRef.current = audioEl
      pc.ontrack = (e) => {
        if (e.streams[0]) {
          audioEl.srcObject = e.streams[0]
          setRemoteVoiceStream(e.streams[0])
        }
      }

      stream.getTracks().forEach((track) => pc.addTrack(track, stream))
      const dc = pc.createDataChannel('oai-events')
      oaiDataChannelRef.current = dc

      /** After `end_call`, wait for assistant audio to finish (min delay + remote silence). */
      const scheduleGracefulEndCall = () => {
        if (endCallTimeoutRef.current) {
          clearTimeout(endCallTimeoutRef.current)
          endCallTimeoutRef.current = null
        }
        if (endCallRafRef.current != null) {
          cancelAnimationFrame(endCallRafRef.current)
          endCallRafRef.current = null
        }
        setClosingPending(true)

        const start = Date.now()
        let lastLoudAt = Date.now()
        const minMs = 1600
        const silenceMs = 550
        const maxMs = 14000
        const loudThreshold = 10

        const runTick = () => {
          const elapsed = Date.now() - start
          const analyser = remoteAnalyserRef.current
          if (analyser) {
            const buf = new Uint8Array(analyser.frequencyBinCount)
            analyser.getByteFrequencyData(buf)
            let sum = 0
            for (let i = 0; i < buf.length; i++) sum += buf[i]
            const avg = sum / buf.length
            if (avg > loudThreshold) {
              lastLoudAt = Date.now()
            }
          }

          const minDone = elapsed >= minMs
          const quietAfterSpeech = Date.now() - lastLoudAt >= silenceMs
          if ((minDone && quietAfterSpeech) || elapsed >= maxMs) {
            setClosingPending(false)
            endVoiceCall('end_call')
            endCallRafRef.current = null
            return
          }
          endCallRafRef.current = requestAnimationFrame(runTick)
        }

        if (!remoteAnalyserRef.current) {
          endCallTimeoutRef.current = setTimeout(() => {
            endCallTimeoutRef.current = null
            setClosingPending(false)
            endVoiceCall('end_call')
          }, 2500)
          return
        }

        endCallTimeoutRef.current = setTimeout(() => {
          endCallTimeoutRef.current = null
          endCallRafRef.current = requestAnimationFrame(runTick)
        }, 50)
      }

      dc.onmessage = async (event) => {
        try {
          const payload = JSON.parse(event.data as string) as {
            type?: string
            tool_calls?: Array<{
              id?: string
              call_id?: string
              name?: string
              arguments?: string
            }>
            response?: {
              output?: Array<{ id?: string; type?: string; name?: string; arguments?: string }>
            }
          }

          /** Shared path: cue + Realtime function_call_output so the model always receives tool results. */
          const finalizeRealtimeToolOutput = (callId: string | undefined, summary: string | null) => {
            if (summary == null || summary === '') return
            const lowerSummary = summary.toLowerCase()
            const isErrorSummary =
              lowerSummary.startsWith('error ') ||
              lowerSummary.startsWith('failed ') ||
              lowerSummary.includes('failed to ')
            playCue(isErrorSummary ? 'error' : 'done')
            if (callId) {
              dc.send(
                JSON.stringify({
                  type: 'conversation.item.create',
                  item: {
                    type: 'function_call_output',
                    call_id: callId,
                    output: summary,
                  },
                }),
              )
            }
          }

          const runTool = async (
            name: string,
            args: Record<string, unknown>,
          ): Promise<string | null> => {
            if (!name) return null
            if (name === 'end_call') {
              scheduleGracefulEndCall()
              return 'Call ended.'
            }
            toolInFlightRef.current = true
            const abort = new AbortController()
            const abortTimer = setTimeout(() => abort.abort(), VOICE_TOOL_FETCH_TIMEOUT_MS)
            try {
              const res = await fetch('/api/divine/voice-tool', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name, arguments: args }),
                signal: abort.signal,
              })
              const data = (await res.json().catch(() => ({}))) as {
                error?: string
                content?: string
                ui_actions?: { type: string; path?: string; fanId?: string }[]
                pending_confirmations?: { type: string; intent_id: string; summary?: string }[]
              }
              if (!res.ok) {
                const detail = data.error?.trim() || `HTTP ${res.status}`
                return `Error: Tool failed (${detail}). Say this to the creator and suggest Divine text chat if it keeps happening.`
              }
              if (Array.isArray(data.ui_actions) && data.ui_actions.length) {
                const raw = data.ui_actions as DivineUiAction[]
                for (const a of raw) {
                  if (a.type === 'voice_set_hangup' && 'allowed' in a && a.allowed) {
                    setUserHangupAllowed(true)
                  }
                }
                const rest = raw.filter((a) => a.type !== 'voice_set_hangup')
                if (rest.length) {
                  divinePanel?.applyUiActionsFromTools?.(rest)
                }
              }
              let out = typeof data.content === 'string' ? data.content.trim() : ''
              if (Array.isArray(data.pending_confirmations) && data.pending_confirmations.length) {
                lastPendingConfirmationsRef.current = data.pending_confirmations
                const note = data.pending_confirmations
                  .map((p) => `${p.type}${p.summary ? `: ${p.summary}` : ''}`)
                  .join('; ')
                out = out ? `${out}\n\n(Confirmation required in app: ${note})` : `Confirmation required in app: ${note}`
              } else {
                lastPendingConfirmationsRef.current = []
              }
              void fetch('/api/divine/voice-memory', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: {
                    tool: name,
                    summary: `${name}: ${summarizeVoiceToolArgs(args)}`,
                  },
                  status: 'in_progress' as const,
                  pending_confirmations:
                    data.pending_confirmations && data.pending_confirmations.length > 0
                      ? data.pending_confirmations
                      : undefined,
                }),
              }).catch(() => undefined)
              if (!out) {
                return `Error: Tool returned no text (empty response). Tell the creator the server may have timed out or Divine Manager blocked the action; suggest trying Divine text chat.`
              }
              return out
            } catch (e) {
              const aborted =
                (typeof DOMException !== 'undefined' && e instanceof DOMException && e.name === 'AbortError') ||
                (e instanceof Error && e.name === 'AbortError')
              if (aborted) {
                return `Error: Tool timed out after ${Math.round(VOICE_TOOL_FETCH_TIMEOUT_MS / 1000)}s (OnlyFans or AI was too slow). Tell the creator to try again or use Divine text chat.`
              }
              const msg = e instanceof Error ? e.message : 'network error'
              return `Error: Tool request failed (${msg}). Tell the creator and suggest Divine text chat if it persists.`
            } finally {
              clearTimeout(abortTimer)
              toolInFlightRef.current = false
              scheduleIdleDisconnectRef.current()
            }
          }
          const toolCalls =
            payload?.tool_calls ??
            (payload as { tool_calls?: Array<{ name?: string; arguments?: string }> })?.tool_calls
          if (Array.isArray(toolCalls) && toolCalls.length > 0) {
            // Execute tools in parallel to reduce wall-time.
            // Keep `end_call` last so we don't close the session before other tools finish.
            const endCallToolCalls = toolCalls.filter((tc) => tc.name === 'end_call')
            const parallelToolCalls = toolCalls.filter((tc) => tc.name && tc.name !== 'end_call')

            await Promise.all(
              parallelToolCalls.map(async (tc) => {
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
                const callId = tc.id ?? tc.call_id
                const summary = await runTool(name!, args)
                finalizeRealtimeToolOutput(callId, summary)
              }),
            )

            for (const tc of endCallToolCalls) {
              if (!tc.name) continue
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
              const callId = tc.id ?? tc.call_id
              const summary = await runTool(tc.name, args)
              finalizeRealtimeToolOutput(callId, summary)
            }
            return
          }
          if (payload?.type === 'response.done' && Array.isArray(payload.response?.output)) {
            // Parallelize function_call tool runs and send outputs back per call_id.
            const fnItems = payload.response.output.filter(
              (item) => item?.type === 'function_call' && item.name,
            ) as Array<{ id?: string; name: string; arguments?: string }>

            await Promise.all(
              fnItems.map(async (item) => {
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

                const summary = await runTool(item.name, args as Record<string, unknown>)
                finalizeRealtimeToolOutput(item.id, summary)
              }),
            )
          }
        } catch {
          // ignore non-JSON or unexpected format
        }
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const res = await fetch('/api/ai/divine-manager-realtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sdp: offer.sdp ?? '',
          focusedFan: focusedFanForVoice,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || `Session failed ${res.status}`)
      }
      const answerSdp = await res.text()
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answerSdp }))
      setStatus('connected')
      resumeBriefingSentRef.current = false
      scheduleIdleDisconnectRef.current()
      void (async () => {
        try {
          const memRes = await fetch('/api/divine/voice-memory', { credentials: 'include' })
          const memJson = (await memRes.json().catch(() => ({}))) as {
            memory?: {
              status?: string
              resume_hint?: string
              action_log?: Array<{ tool: string }>
            }
          }
          const m = memJson.memory
          const hasResumeContext =
            m?.resume_hint ||
            (Array.isArray(m?.action_log) && m.action_log.length > 0)
          if (m?.status === 'in_progress' && hasResumeContext && !resumeBriefingSentRef.current) {
            resumeBriefingSentRef.current = true
            await sendBriefingQuestion(
              `The last voice session ended before everything finished. Resume hint: ${m.resume_hint}. Ask briefly if they want to continue that or start fresh; if they decline, move on.`,
            )
          }
        } catch {
          // ignore resume prompt failures
        }
      })()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to start voice call'
      endVoiceCall('error')
      setError(msg)
      setStatus('error')
      playCue('error')
    }
  }, [endVoiceCall, playCue, status, divinePanel, sendBriefingQuestion, refreshVoiceHangupPolicy])

  /** Arm optional idle disconnect when session becomes connected (no-op if NEXT_PUBLIC_DIVINE_VOICE_IDLE_MS unset). */
  useEffect(() => {
    if (status !== 'connected') return
    scheduleIdleDisconnectRef.current()
  }, [status, scheduleIdleDisconnect])

  /** User speech resets the idle timer (only if env enables idle disconnect). */
  useEffect(() => {
    if (status !== 'connected') return
    const id = setInterval(() => {
      const a = localAnalyserRef.current
      if (!a) return
      const buf = new Uint8Array(a.frequencyBinCount)
      a.getByteFrequencyData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i++) sum += buf[i]
      if (sum / buf.length > 10) scheduleIdleDisconnectRef.current()
    }, 220)
    return () => clearInterval(id)
  }, [status])

  /** Purple (working) vs gold (speaking) vs idle. */
  useEffect(() => {
    if (status !== 'connected') {
      setVoiceSurfaceState('idle')
      return
    }
    const id = setInterval(() => {
      const remote = remoteAnalyserRef.current
      let remoteLoud = false
      if (remote) {
        const buf = new Uint8Array(remote.frequencyBinCount)
        remote.getByteFrequencyData(buf)
        let sum = 0
        for (let i = 0; i < buf.length; i++) sum += buf[i]
        remoteLoud = sum / buf.length > 9
      }
      assistantSpeakingRef.current = remoteLoud
      const prev = prevRemoteLoudRef.current
      prevRemoteLoudRef.current = remoteLoud
      if (!prev && remoteLoud) {
        cancelIdleTimerRef.current()
      }
      if (prev && !remoteLoud) {
        scheduleIdleDisconnectRef.current()
      }
      if (remoteLoud) setVoiceSurfaceState('speaking')
      else if (toolInFlightRef.current) setVoiceSurfaceState('working')
      else setVoiceSurfaceState('idle')
    }, 140)
    return () => clearInterval(id)
  }, [status])

  useEffect(() => {
    return () => {
      endVoiceCall('user_hangup')
    }
  }, [endVoiceCall])

  // Divine (remote) waveform: react to sound with lower smoothing so it fluctuates visibly
  useEffect(() => {
    if (!remoteVoiceStream || !voiceVizRef.current) return
    const canvas = voiceVizRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    try {
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(remoteVoiceStream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 128
      analyser.smoothingTimeConstant = 0.35
      remoteAnalyserRef.current = analyser
      source.connect(analyser)
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      let rafId: number
      const draw = () => {
        rafId = requestAnimationFrame(draw)
        analyser.getByteFrequencyData(dataArray)
        const w = canvas.width
        const h = canvas.height
        ctx.clearRect(0, 0, w, h)
        const barCount = 24
        const barW = w / barCount
        const gap = 2
        for (let i = 0; i < barCount; i++) {
          const v = dataArray[Math.floor((i / barCount) * dataArray.length)] ?? 0
          const barH = Math.max(6, (v / 255) * h * 0.85)
          const x = i * barW + gap / 2
          const y = (h - barH) / 2
          ctx.fillStyle = `rgba(168, 85, 247, ${0.5 + (v / 255) * 0.5})`
          ctx.beginPath()
          if (typeof (ctx as unknown as { roundRect?: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect === 'function') {
            (ctx as unknown as { roundRect: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect(x, y, barW - gap, barH, 4)
            ctx.fill()
          } else {
            ctx.fillRect(x, y, barW - gap, barH)
          }
        }
      }
      draw()
      return () => {
        cancelAnimationFrame(rafId)
        remoteAnalyserRef.current = null
        audioContext.close()
      }
    } catch {
      return undefined
    }
  }, [remoteVoiceStream])

  // User (local mic) waveform: same style, amber color, fluctuates with your voice
  useEffect(() => {
    if (!localVoiceStream || !userVoiceVizRef.current) return
    const canvas = userVoiceVizRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    try {
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(localVoiceStream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 128
      analyser.smoothingTimeConstant = 0.35
      source.connect(analyser)
      localAnalyserRef.current = analyser
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      let rafId: number
      const draw = () => {
        rafId = requestAnimationFrame(draw)
        analyser.getByteFrequencyData(dataArray)
        const w = canvas.width
        const h = canvas.height
        ctx.clearRect(0, 0, w, h)
        const barCount = 24
        const barW = w / barCount
        const gap = 2
        for (let i = 0; i < barCount; i++) {
          const v = dataArray[Math.floor((i / barCount) * dataArray.length)] ?? 0
          const barH = Math.max(6, (v / 255) * h * 0.85)
          const x = i * barW + gap / 2
          const y = (h - barH) / 2
          ctx.fillStyle = `rgba(245, 158, 11, ${0.5 + (v / 255) * 0.5})`
          ctx.beginPath()
          if (typeof (ctx as unknown as { roundRect?: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect === 'function') {
            (ctx as unknown as { roundRect: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect(x, y, barW - gap, barH, 4)
            ctx.fill()
          } else {
            ctx.fillRect(x, y, barW - gap, barH)
          }
        }
      }
      draw()
      return () => {
        cancelAnimationFrame(rafId)
        localAnalyserRef.current = null
        audioContext.close()
      }
    } catch {
      return undefined
    }
  }, [localVoiceStream])

  const canManualHangup = voiceHangupPolicy === 'always' || userHangupAllowed

  const forceEndVoiceCall = useCallback(() => {
    endVoiceCall('user_hangup')
  }, [endVoiceCall])

  const value: VoiceSessionContextValue = {
    status,
    voiceSurfaceState,
    closingPending,
    error,
    startVoiceCall,
    endVoiceCall,
    sendBriefingQuestion,
    remoteVoiceStream,
    localVoiceStream,
    voiceVizRef,
    userVoiceVizRef,
    focusedFanForVoice,
    setFocusedFanForVoice,
    voiceHangupPolicy,
    userHangupAllowed,
    canManualHangup,
    forceEndVoiceCall,
  }

  return (
    <VoiceSessionContext.Provider value={value}>
      {children}
    </VoiceSessionContext.Provider>
  )
}

