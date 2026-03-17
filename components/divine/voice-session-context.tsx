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
import type { FocusedFan } from '@/components/divine/divine-panel-context'

type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'error'

type VoiceSessionContextValue = {
  status: VoiceStatus
  error: string | null
  startVoiceCall: () => Promise<void>
  endVoiceCall: () => void
  remoteVoiceStream: MediaStream | null
  voiceVizRef: React.RefObject<HTMLCanvasElement>
  focusedFanForVoice: FocusedFan | null
  setFocusedFanForVoice: (fan: FocusedFan | null) => void
}

const VoiceSessionContext = createContext<VoiceSessionContextValue | null>(null)

export function useVoiceSession(): VoiceSessionContextValue | null {
  return useContext(VoiceSessionContext)
}

export function VoiceSessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [remoteVoiceStream, setRemoteVoiceStream] = useState<MediaStream | null>(null)
  const voiceVizRef = useRef<HTMLCanvasElement | null>(null)
  const [focusedFanForVoice, setFocusedFanForVoice] = useState<FocusedFan | null>(null)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetIdleRef = useRef<(() => void) | null>(null)

  const IDLE_MS = 2.5 * 60 * 1000

  const endVoiceCall = useCallback(() => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current)
      idleTimeoutRef.current = null
    }
    resetIdleRef.current = null
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
    setStatus('idle')
    setError(null)
  }, [])

  const startVoiceCall = useCallback(async () => {
    if (status === 'connecting' || status === 'connected') return
    setError(null)
    setStatus('connecting')
    try {
      if (typeof navigator === 'undefined') {
        throw new Error('Navigator not available')
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
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
              endVoiceCall()
              return
            }
            if (name === 'get_dm_conversations') {
              const limit = typeof args.limit === 'number' ? args.limit : 20
              const queryParam =
                typeof args.query === 'string' && args.query.trim().length
                  ? `&query=${encodeURIComponent(args.query.trim())}`
                  : ''
              await fetch(`/api/divine/dm-conversations?limit=${limit}${queryParam}`)
            } else if (name === 'get_dm_thread') {
              const fanId = (args as { fanId?: unknown }).fanId
              if (!fanId || typeof fanId !== 'string') return
              await fetch('/api/divine/dm-thread', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fanId }),
              })
            } else if (name === 'get_reply_suggestions') {
              const fanId = (args as { fanId?: unknown }).fanId
              if (!fanId || typeof fanId !== 'string') return
              await fetch('/api/divine/dm-reply-suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fanId }),
              })
            } else if (name === 'list_content') {
              const limit = typeof args.limit === 'number' ? args.limit : 20
              const status = typeof (args as { status?: unknown }).status === 'string'
                ? (args as { status?: string }).status
                : ''
              const q = new URLSearchParams({ limit: String(limit) })
              if (status) q.set('status', status)
              await fetch(`/api/divine/content-list?${q.toString()}`)
            }
          }
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
                await runTool(item.name, args as Record<string, unknown>)
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
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to start voice call'
      setError(msg)
      setStatus('error')
      endVoiceCall()
    }
  }, [endVoiceCall, status])

  useEffect(() => {
    if (status !== 'connected') return
    const resetIdle = () => {
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current)
      idleTimeoutRef.current = setTimeout(() => {
        idleTimeoutRef.current = null
        endVoiceCall()
      }, IDLE_MS)
    }
    resetIdleRef.current = resetIdle
    resetIdle()
    return () => {
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current)
      idleTimeoutRef.current = null
      resetIdleRef.current = null
    }
  }, [status, endVoiceCall])

  useEffect(() => {
    return () => {
      endVoiceCall()
    }
  }, [endVoiceCall])

  // Simple waveform: just depend on remoteVoiceStream and existing canvas ref
  useEffect(() => {
    if (!remoteVoiceStream || !voiceVizRef.current) return
    const canvas = voiceVizRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    try {
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(remoteVoiceStream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 64
      analyser.smoothingTimeConstant = 0.7
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
          const barH = Math.max(4, (v / 255) * h * 0.7)
          const x = i * barW + gap / 2
          const y = (h - barH) / 2
          ctx.fillStyle = `rgba(168, 85, 247, ${0.4 + (v / 255) * 0.6})`
          ctx.beginPath()
          // @ts-ignore roundRect not always present in lib dom types
          ctx.roundRect(x, y, barW - gap, barH, 4)
          ctx.fill()
        }
      }
      draw()
      return () => {
        cancelAnimationFrame(rafId)
        audioContext.close()
      }
    } catch {
      return undefined
    }
  }, [remoteVoiceStream])

  const value: VoiceSessionContextValue = {
    status,
    error,
    startVoiceCall,
    endVoiceCall,
    remoteVoiceStream,
    voiceVizRef,
    focusedFanForVoice,
    setFocusedFanForVoice,
  }

  return (
    <VoiceSessionContext.Provider value={value}>
      {children}
    </VoiceSessionContext.Provider>
  )
}

