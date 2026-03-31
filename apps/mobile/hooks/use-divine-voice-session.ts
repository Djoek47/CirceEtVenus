import Constants from 'expo-constants'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform } from 'react-native'
import type { MediaStream, RTCPeerConnection } from 'react-native-webrtc'
import { apiFetch } from '@/lib/api'

type PeerConn = InstanceType<typeof RTCPeerConnection>
type MediaStreamInstance = InstanceType<typeof MediaStream>
type DataChannelInstance = ReturnType<PeerConn['createDataChannel']>

export type FocusedFan = { id?: string; username?: string | null; name?: string | null }

type VoiceDisconnectReason = 'idle_timeout' | 'user_hangup' | 'end_call' | 'error'

export type DivineVoiceSession = {
  voiceAvailable: boolean
  status: 'idle' | 'connecting' | 'connected' | 'error'
  error: string | null
  pendingConfirmations: Array<{ type: string; intent_id: string; summary?: string }>
  startVoiceCall: (focusedFan?: FocusedFan | null) => Promise<void>
  endVoiceCall: (reason?: VoiceDisconnectReason) => void
  dismissPendingConfirmation: (intentId: string) => void
}

const VOICE_TOOL_FETCH_TIMEOUT_MS = 115_000
const isExpoGo = Constants.appOwnership === 'expo'

let webrtcGlobalsRegistered = false

function getWebrtcModule(): typeof import('react-native-webrtc') | null {
  if (Platform.OS === 'web' || isExpoGo) return null
  const m = require('react-native-webrtc') as typeof import('react-native-webrtc')
  if (!webrtcGlobalsRegistered) {
    m.registerGlobals()
    webrtcGlobalsRegistered = true
  }
  return m
}

function extractRealtimeFunctionCallId(item: {
  call_id?: string
  id?: string
  name?: string
  arguments?: string
}): string | undefined {
  const cid = item.call_id ?? item.id
  return typeof cid === 'string' && cid.length > 0 ? cid : undefined
}

/** Minimal shape for Realtime JSON over WebRTC data channel */
type DataChannelLike = { send: (data: string) => void }

function injectToolResultFallback(dc: DataChannelLike, toolName: string, summary: string) {
  const text = `[${toolName} tool result]\n${summary}`.slice(0, 12_000)
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
}

function triggerRealtimeAssistantResponse(dc: DataChannelLike) {
  dc.send(
    JSON.stringify({
      type: 'response.create',
      response: { modalities: ['audio'] },
    }),
  )
}

function summarizeVoiceToolArgs(args: Record<string, unknown>): string {
  try {
    const s = JSON.stringify(args)
    return s.length > 220 ? `${s.slice(0, 220)}…` : s
  } catch {
    return '(args)'
  }
}

export function useDivineVoiceSession(): DivineVoiceSession {
  const [status, setStatus] = useState<DivineVoiceSession['status']>('idle')
  const [error, setError] = useState<string | null>(null)
  const [pendingConfirmations, setPendingConfirmations] = useState<
    DivineVoiceSession['pendingConfirmations']
  >([])

  const pcRef = useRef<PeerConn | null>(null)
  const streamRef = useRef<MediaStreamInstance | null>(null)
  const oaiDataChannelRef = useRef<DataChannelInstance | null>(null)
  const toolInFlightRef = useRef(false)
  const lastPendingConfirmationsRef = useRef<DivineVoiceSession['pendingConfirmations']>([])
  const focusedFanRef = useRef<FocusedFan | null>(null)
  const endCallTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resumeBriefingSentRef = useRef(false)
  const statusRef = useRef(status)
  statusRef.current = status

  const dismissPendingConfirmation = useCallback((intentId: string) => {
    lastPendingConfirmationsRef.current = lastPendingConfirmationsRef.current.filter(
      (p) => p.intent_id !== intentId,
    )
    setPendingConfirmations((prev) => prev.filter((p) => p.intent_id !== intentId))
  }, [])

  const endVoiceCall = useCallback((reason: VoiceDisconnectReason = 'user_hangup') => {
    const hadToolInFlight = toolInFlightRef.current
    const pendingSnap = [...lastPendingConfirmationsRef.current]
    if (endCallTimeoutRef.current) {
      clearTimeout(endCallTimeoutRef.current)
      endCallTimeoutRef.current = null
    }
    toolInFlightRef.current = false
    lastPendingConfirmationsRef.current = []
    setPendingConfirmations([])
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
    oaiDataChannelRef.current = null
    setStatus('idle')
    setError(null)

    if (Platform.OS === 'web') return

    void apiFetch('/api/divine/voice-memory', {
      method: 'PATCH',
      body: JSON.stringify(
        reason === 'end_call'
          ? { clear: true }
          : {
              disconnect_reason: reason,
              status:
                hadToolInFlight || pendingSnap.length > 0
                  ? 'in_progress'
                  : ('completed' as const),
              resume_hint:
                hadToolInFlight || pendingSnap.length > 0
                  ? `Session ended (${reason}). ${pendingSnap.length ? 'Confirmation pending in app.' : 'Task may have been incomplete.'}`
                  : null,
            },
      ),
    }).catch(() => undefined)
  }, [])

  const sendBriefingQuestion = useCallback(async (text: string, dc: DataChannelInstance | DataChannelLike) => {
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
  }, [])

  const startVoiceCall = useCallback(
    async (focusedFan?: FocusedFan | null) => {
      if (Platform.OS === 'web') return

      const webrtc = getWebrtcModule()
      if (!webrtc) {
        setError(
          'Voice needs a development build with WebRTC (EAS). Expo Go does not include native WebRTC.',
        )
        setStatus('error')
        return
      }
      if (statusRef.current === 'connecting' || statusRef.current === 'connected') return
      focusedFanRef.current = focusedFan ?? null
      setError(null)
      setStatus('connecting')
      try {
        const stream = await webrtc.mediaDevices.getUserMedia({ audio: true, video: false })
        streamRef.current = stream
        const pc = new webrtc.RTCPeerConnection(undefined)
        pcRef.current = pc

        stream.getTracks().forEach((track) => pc.addTrack(track, stream))
        const dc = pc.createDataChannel('oai-events')
        oaiDataChannelRef.current = dc

        const scheduleGracefulEndCall = () => {
          if (endCallTimeoutRef.current) clearTimeout(endCallTimeoutRef.current)
          endCallTimeoutRef.current = setTimeout(() => {
            endCallTimeoutRef.current = null
            endVoiceCall('end_call')
          }, 2500)
        }

        const onDataMessage = async (event: { data?: unknown }) => {
          try {
            const payload = JSON.parse(String(event.data ?? '')) as {
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

            const finalizeRealtimeToolOutput = (
              callId: string | undefined,
              summary: string | null,
              toolName?: string,
            ): 'paired' | 'fallback' | 'none' => {
              if (summary == null || summary === '') return 'none'
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
                return 'paired'
              }
              if (toolName) {
                injectToolResultFallback(dc, toolName, summary)
                return 'fallback'
              }
              return 'none'
            }

            const runTool = async (name: string, args: Record<string, unknown>): Promise<string | null> => {
              if (!name) return null
              if (name === 'end_call') {
                scheduleGracefulEndCall()
                return 'Call ended.'
              }
              toolInFlightRef.current = true
              const abort = new AbortController()
              const abortTimer = setTimeout(() => abort.abort(), VOICE_TOOL_FETCH_TIMEOUT_MS)
              try {
                const res = await apiFetch('/api/divine/voice-tool', {
                  method: 'POST',
                  body: JSON.stringify({ name, arguments: args }),
                  signal: abort.signal,
                })
                const data = (await res.json().catch(() => ({}))) as {
                  error?: string
                  content?: string
                  pending_confirmations?: { type: string; intent_id: string; summary?: string }[]
                }
                if (!res.ok) {
                  const detail = data.error?.trim() || `HTTP ${res.status}`
                  return `Error: Tool failed (${detail}). Say this to the creator and suggest Divine text chat if it keeps happening.`
                }
                let out = typeof data.content === 'string' ? data.content.trim() : ''
                if (Array.isArray(data.pending_confirmations) && data.pending_confirmations.length) {
                  lastPendingConfirmationsRef.current = data.pending_confirmations
                  setPendingConfirmations(data.pending_confirmations)
                  const note = data.pending_confirmations
                    .map((p) => `${p.type}${p.summary ? `: ${p.summary}` : ''}`)
                    .join('; ')
                  out = out
                    ? `${out}\n\n(Confirmation required in app: ${note})`
                    : `Confirmation required in app: ${note}`
                } else {
                  lastPendingConfirmationsRef.current = []
                  setPendingConfirmations([])
                }
                void apiFetch('/api/divine/voice-memory', {
                  method: 'POST',
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
              }
            }

            const toolCalls =
              payload?.tool_calls ??
              (payload as { tool_calls?: Array<{ name?: string; arguments?: string }> })?.tool_calls
            if (Array.isArray(toolCalls) && toolCalls.length > 0) {
              const endCallToolCalls = toolCalls.filter((tc) => tc.name === 'end_call')
              const parallelToolCalls = toolCalls.filter((tc) => tc.name && tc.name !== 'end_call')

              let needAssistantResponse = false
              const results = await Promise.all(
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
                  const callId = extractRealtimeFunctionCallId(tc)
                  const summary = await runTool(name!, args)
                  return finalizeRealtimeToolOutput(callId, summary, name!)
                }),
              )
              if (results.some((r) => r === 'paired')) needAssistantResponse = true

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
                const callId = extractRealtimeFunctionCallId(tc)
                const summary = await runTool(tc.name, args)
                if (finalizeRealtimeToolOutput(callId, summary, tc.name) === 'paired') {
                  needAssistantResponse = true
                }
              }
              if (needAssistantResponse) {
                triggerRealtimeAssistantResponse(dc)
              }
              return
            }
            if (payload?.type === 'response.done' && Array.isArray(payload.response?.output)) {
              const fnItems = payload.response!.output!.filter(
                (item) => item?.type === 'function_call' && item.name,
              ) as Array<{ id?: string; call_id?: string; name: string; arguments?: string }>

              const doneResults = await Promise.all(
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
                      : (item.arguments ?? {}) as Record<string, unknown>

                  const summary = await runTool(item.name, args as Record<string, unknown>)
                  return finalizeRealtimeToolOutput(extractRealtimeFunctionCallId(item), summary, item.name)
                }),
              )
              if (doneResults.some((r) => r === 'paired')) {
                triggerRealtimeAssistantResponse(dc)
              }
            }
          } catch {
            // ignore malformed events
          }
        }
        // Runtime matches browser WebRTC; typings omit `onmessage`.
        ;(dc as unknown as { onmessage: (ev: { data?: unknown }) => void }).onmessage = onDataMessage

        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        const res = await apiFetch('/api/ai/divine-manager-realtime', {
          method: 'POST',
          body: JSON.stringify({
            sdp: offer.sdp ?? '',
            focusedFan: focusedFanRef.current ?? undefined,
          }),
        })
        if (!res.ok) {
          const text = await res.text()
          let parsed: { error?: string; details?: string } = {}
          try {
            parsed = JSON.parse(text) as { error?: string; details?: string }
          } catch {
            // ignore
          }
          throw new Error(parsed.error || parsed.details || text || `Session failed ${res.status}`)
        }
        const answerSdp = await res.text()
        await pc.setRemoteDescription(
          new webrtc.RTCSessionDescription({ type: 'answer', sdp: answerSdp }),
        )
        setStatus('connected')
        resumeBriefingSentRef.current = false
        void (async () => {
          try {
            const memRes = await apiFetch('/api/divine/voice-memory')
            const memJson = (await memRes.json().catch(() => ({}))) as {
              memory?: {
                status?: string
                resume_hint?: string
                action_log?: Array<{ tool: string }>
              }
            }
            const m = memJson.memory
            const hasResumeContext =
              m?.resume_hint || (Array.isArray(m?.action_log) && m.action_log.length > 0)
            if (
              m?.status === 'in_progress' &&
              hasResumeContext &&
              !resumeBriefingSentRef.current &&
              oaiDataChannelRef.current
            ) {
              resumeBriefingSentRef.current = true
              await sendBriefingQuestion(
                `The last voice session ended before everything finished. Resume hint: ${m.resume_hint}. Ask briefly if they want to continue that or start fresh; if they decline, move on.`,
                oaiDataChannelRef.current,
              )
            }
          } catch {
            // ignore
          }
        })()
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to start voice call'
        endVoiceCall('error')
        setError(msg)
        setStatus('error')
      }
    },
    [endVoiceCall, sendBriefingQuestion],
  )

  useEffect(() => {
    return () => {
      endVoiceCall()
    }
  }, [endVoiceCall])

  return {
    voiceAvailable: Platform.OS !== 'web' && !isExpoGo,
    status,
    error,
    pendingConfirmations,
    startVoiceCall,
    endVoiceCall,
    dismissPendingConfirmation,
  }
}
