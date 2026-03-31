'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

declare global {
  interface Window {
    __CREATIX_SESSION__?: { access_token: string; refresh_token: string }
    ReactNativeWebView?: { postMessage: (msg: string) => void }
  }
}

function notifyRn(type: string, extra?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type, ...extra }))
  }
}

export default function MobileOnlyFansConnectPage() {
  const [status, setStatus] = useState<'waiting' | 'ready' | 'connecting' | 'done' | 'error'>('waiting')
  const [message, setMessage] = useState('Waiting for app session…')
  const startedRef = useRef(false)
  const sessionAppliedRef = useRef(false)

  const runConnect = useCallback(async () => {
    if (startedRef.current) return
    startedRef.current = true
    setStatus('connecting')
    setMessage('Starting OnlyFans sign-in…')

    const supabase = createClient()

    const cancelOnlyfansSdkAuth = async (reason?: string) => {
      try {
        await fetch('/api/onlyfans/cancel-auth', { method: 'POST', credentials: 'include' })
      } catch {
        /* ignore */
      }
      if (reason) setMessage(reason)
      setStatus('error')
      notifyRn('onlyfans-error', { message: reason })
    }

    try {
      try {
        await fetch('/api/onlyfans/cancel-auth', { method: 'POST', credentials: 'include' })
      } catch {
        /* best-effort */
      }

      const res = await fetch('/api/onlyfans/auth', { credentials: 'include' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 409 && (data as { code?: string }).code === 'ALREADY_CONNECTED') {
          setMessage((data as { error?: string }).error ?? 'OnlyFans is already connected.')
          setStatus('done')
          notifyRn('onlyfans-success', { alreadyConnected: true })
          return
        }
        throw new Error((data as { error?: string }).error ?? 'Failed to get session')
      }
      const { token } = (await res.json()) as { token?: string }
      if (!token || typeof token !== 'string') throw new Error('No session token')

      const { startOnlyFansAuthentication } = await import('@onlyfansapi/auth')
      startOnlyFansAuthentication(token, {
        onContinue: () => {},
        onSuccess: async (data: { accountId: string; username?: string }) => {
          try {
            const {
              data: { user },
            } = await supabase.auth.getUser()
            const cbRes = await fetch('/api/onlyfans/callback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                accountId: data.accountId,
                username: data.username,
                clientReferenceId: user?.id,
              }),
            })
            if (!cbRes.ok) {
              const err = await cbRes.json().catch(() => ({}))
              if (cbRes.status === 409 && (err as { code?: string }).code === 'ONLYFANS_ACCOUNT_ALREADY_CONNECTED') {
                setMessage(
                  'This OnlyFans account is already connected to another Circe et Venus workspace.',
                )
              } else {
                setMessage((err as { error?: string }).error ?? 'Failed to save connection')
              }
              setStatus('error')
              notifyRn('onlyfans-error', { message: String((err as { error?: string }).error) })
              return
            }
            try {
              await fetch('/api/onlyfans/sync', { method: 'POST', credentials: 'include' })
            } catch {
              /* non-fatal */
            }
            setMessage(`OnlyFans connected as @${data.username ?? 'user'}!`)
            setStatus('done')
            notifyRn('onlyfans-success', { username: data.username })
          } catch (e) {
            const m = e instanceof Error ? e.message : 'Failed to save connection'
            setMessage(m)
            setStatus('error')
            notifyRn('onlyfans-error', { message: m })
          }
        },
        onError: (err: { message?: string; code?: string }) => {
          if (err?.code === 'AUTH_CANCELLED') {
            void cancelOnlyfansSdkAuth('OnlyFans sign-in was cancelled')
            return
          }
          void cancelOnlyfansSdkAuth(err?.message ?? 'OnlyFans sign-in failed')
        },
      })
    } catch (e) {
      const m = e instanceof Error ? e.message : 'Failed to start OnlyFans sign-in'
      setMessage(m)
      setStatus('error')
      notifyRn('onlyfans-error', { message: m })
    }
  }, [])

  useEffect(() => {
    function onSessionReady() {
      if (sessionAppliedRef.current) return
      const raw = window.__CREATIX_SESSION__
      if (!raw?.access_token || !raw?.refresh_token) {
        setMessage('Invalid session from app. Close and try again.')
        setStatus('error')
        return
      }
      sessionAppliedRef.current = true
      void (async () => {
        const supabase = createClient()
        const { error } = await supabase.auth.setSession({
          access_token: raw.access_token,
          refresh_token: raw.refresh_token,
        })
        if (error) {
          setMessage(error.message)
          setStatus('error')
          notifyRn('onlyfans-error', { message: error.message })
          return
        }
        setStatus('ready')
        setMessage('Session ready. Starting connection…')
        await runConnect()
      })()
    }

    window.addEventListener('creatix-session-ready', onSessionReady)
    if (window.__CREATIX_SESSION__?.access_token) {
      queueMicrotask(onSessionReady)
    }

    const t = window.setTimeout(() => {
      if (!sessionAppliedRef.current) {
        setMessage(
          'Open this screen from the Circe et Venus app (Settings → Connect OnlyFans), or sign in on the web.',
        )
      }
    }, 12000)

    return () => {
      window.removeEventListener('creatix-session-ready', onSessionReady)
      window.clearTimeout(t)
    }
  }, [runConnect])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#fafafa',
        fontFamily: 'system-ui, sans-serif',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      <p style={{ color: '#d4af37', fontWeight: 700, marginBottom: 8 }}>Circe et Venus</p>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>OnlyFans connection</h1>
      <p style={{ color: '#a3a3a3', maxWidth: 360, lineHeight: 1.5 }}>{message}</p>
      {status === 'error' ? (
        <p style={{ color: '#f87171', marginTop: 16, fontSize: 14 }}>You can close this window.</p>
      ) : null}
      {status === 'done' ? (
        <p style={{ color: '#4ade80', marginTop: 16, fontSize: 14 }}>You can return to the app.</p>
      ) : null}
    </div>
  )
}
