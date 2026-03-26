import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'

export interface OnlyFansRouteContext {
  api: ReturnType<typeof createOnlyFansAPI>
  accountId: string
  userId: string
}

/**
 * Authenticated OnlyFans API for the current user (platform_connections.access_token = account id).
 */
export async function requireOnlyFansApi(
  supabase: SupabaseClient,
): Promise<{ ok: true; ctx: OnlyFansRouteContext } | { ok: false; response: NextResponse }> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('access_token')
    .eq('user_id', user.id)
    .eq('platform', 'onlyfans')
    .eq('is_connected', true)
    .maybeSingle()
  if (!connection?.access_token) {
    return { ok: false, response: NextResponse.json({ error: 'OnlyFans not connected' }, { status: 400 }) }
  }
  const api = createOnlyFansAPI()
  api.setAccountId(connection.access_token)
  return { ok: true, ctx: { api, accountId: connection.access_token, userId: user.id } }
}

export async function handleOnlyFansSessionError(
  supabase: SupabaseClient,
  err: unknown,
): Promise<NextResponse | null> {
  const message = err instanceof Error ? err.message : String(err)
  if (!message.includes('ONLYFANS_SESSION_EXPIRED')) return null
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('platform_connections')
        .update({ is_connected: false, access_token: null })
        .eq('user_id', user.id)
        .eq('platform', 'onlyfans')
    }
  } catch {
    // best-effort
  }
  return NextResponse.json(
    {
      error: 'OnlyFans session expired',
      code: 'ONLYFANS_SESSION_EXPIRED',
      message:
        'Your OnlyFans session with our data partner expired. Please reconnect OnlyFans from your dashboard.',
    },
    { status: 401 },
  )
}

export async function jsonOnlyFansError(supabase: SupabaseClient, err: unknown): Promise<NextResponse> {
  const session = await handleOnlyFansSessionError(supabase, err)
  if (session) return session
  return NextResponse.json(
    { error: err instanceof Error ? err.message : 'Request failed' },
    { status: 500 },
  )
}

/** Ensure team analytics payloads include the connected OnlyFans account id. */
export function withDefaultAccountIds(
  body: Record<string, unknown> | null | undefined,
  accountId: string,
): Record<string, unknown> {
  const o = body && typeof body === 'object' ? { ...body } : {}
  const ids = o.account_ids
  if (Array.isArray(ids) && ids.length > 0) return o
  o.account_ids = [accountId]
  return o
}
