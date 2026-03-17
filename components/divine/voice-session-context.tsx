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
      dc.onmessage = () => {
        resetIdleRef.current?.()
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

