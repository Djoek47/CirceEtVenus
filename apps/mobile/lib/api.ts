import { supabase } from '@/lib/supabase'

/**
 * Calls the Creatix Next.js API with `Authorization: Bearer <access_token>` when a session exists.
 * Handlers using `createRouteHandlerClient` accept this (see `lib/supabase/route-handler.ts` in the web app).
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const token = session?.access_token
  const base = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '')
  if (!base) {
    console.warn('EXPO_PUBLIC_API_URL is not set; API calls will fail.')
  }
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const headers = new Headers(init?.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init?.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(url, { ...init, headers })
}
