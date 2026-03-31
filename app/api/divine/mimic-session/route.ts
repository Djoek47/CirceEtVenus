/**
 * Persisted Divine mimic interview session (profile + answers JSON) for the current user.
 *
 * **Consumers:** web dashboard, PWA, Capacitor WebView, native Expo.
 * **Auth:** `createRouteHandlerClient` — cookies (web) or `Authorization: Bearer` (native); 401 if missing.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

export async function GET(request: NextRequest) {
  const supabase = await createRouteHandlerClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: row, error } = await supabase
    .from('mimic_test_sessions')
    .select('profile_json, answers_json, updated_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const r = row as { profile_json?: unknown; answers_json?: unknown; updated_at?: string } | null
  return NextResponse.json({
    profile_json: r?.profile_json ?? {},
    answers_json: r?.answers_json ?? {},
    updated_at: r?.updated_at,
  })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createRouteHandlerClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as {
    profile_json?: unknown
    answers_json?: unknown
  }

  const profile_json =
    body.profile_json != null && typeof body.profile_json === 'object' ? body.profile_json : {}
  const answers_json =
    body.answers_json != null && typeof body.answers_json === 'object' ? body.answers_json : {}

  const { error } = await supabase.from('mimic_test_sessions').upsert(
    {
      user_id: user.id,
      profile_json,
      answers_json,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
