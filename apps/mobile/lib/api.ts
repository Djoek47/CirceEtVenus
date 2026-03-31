import { supabase } from '@/lib/supabase'

/**
 * Calls the Creatix Next.js API with `Authorization: Bearer <access_token>`.
 * Handlers use `createRouteHandlerClient` (see web `lib/supabase/route-handler.ts`).
 *
 * Env (set in **Expo app** build — `.env` / EAS secrets, not only Vercel):
 * - `EXPO_PUBLIC_API_URL` — same HTTPS origin as your deployed Next app (e.g. https://www.circeetvenus.com)
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

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const base = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '')
  if (!base) {
    const msg =
      'EXPO_PUBLIC_API_URL is not set. Add it to apps/mobile/.env (or EAS env) — the HTTPS origin of your Creatix deployment.'
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
