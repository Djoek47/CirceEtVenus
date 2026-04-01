import { supabase } from '@/lib/supabase'
import Constants from 'expo-constants'
import { Platform } from 'react-native'

/**
 * Calls the Creatix Next.js API with `Authorization: Bearer <access_token>`.
 * Handlers use `createRouteHandlerClient` (see web `lib/supabase/route-handler.ts`).
 *
 * Env (set in **Expo app** build — `.env` / EAS secrets, not only Vercel):
 * - `EXPO_PUBLIC_API_URL` — same HTTPS origin as your deployed Next app (e.g. https://www.circeetvenus.com)
 * - `EXPO_PUBLIC_API_PORT` (optional dev-only) — port for local API when running on a physical device (default: 3000)
 * - `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` — same Supabase project as the site
 */
async function resolveAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (session?.access_token) return session.access_token
  const { data, error } = await supabase.auth.refreshSession()
  if (error || !data.session?.access_token) return null
  return data.session.access_token
}

function resolveDevApiBase(): string | null {
  if (!__DEV__ || Platform.OS === 'web') return null
  const explicitPort = (process.env.EXPO_PUBLIC_API_PORT ?? '').trim()
  const port = explicitPort || '3000'
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as unknown as { manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } } })
      .manifest2?.extra?.expoGo?.debuggerHost
  const host = hostUri?.split(':')[0]
  if (!host) return null
  return `http://${host}:${port}`
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const configuredBase = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '')
  const base = configuredBase || resolveDevApiBase() || ''
  if (!base) {
    const msg =
      'EXPO_PUBLIC_API_URL is not set. Add it to apps/mobile/.env (or EAS env) — the HTTPS origin of your Creatix deployment. In local native dev, the app can also auto-use your Expo LAN host.'
    if (__DEV__) console.error(msg)
    return Promise.reject(new Error(msg))
  }

  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`

  const buildHeaders = (token: string | null) => {
    const headers = new Headers(init?.headers)
    if (token) headers.set('Authorization', `Bearer ${token}`)
    if (init?.body != null && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    return headers
  }

  const doFetch = async (token: string | null) =>
    fetch(url, { ...init, headers: buildHeaders(token) })

  let token = await resolveAccessToken()
  let res = await doFetch(token)
  if (res.status === 401) {
    await supabase.auth.refreshSession()
    token = await resolveAccessToken()
    res = await doFetch(token)
  }
  return res
}
