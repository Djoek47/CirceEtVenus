/**
 * Community tips feed and submissions (approved tips + current user's drafts).
 *
 * **Consumers:** web dashboard, PWA, Capacitor WebView, native Expo.
 * **Auth:** `createRouteHandlerClient` — cookies (web) or `Authorization: Bearer` (native); 401 if missing.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createServiceRoleClient } from '@/lib/supabase/server'

const MAX_TITLE = 200
const MAX_BODY = 8000

export async function GET(request: NextRequest) {
  const supabase = await createRouteHandlerClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: approved, error } = await supabase
    .from('community_tips')
    .select('id, title, body, status, created_at, user_id')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const feed = await enrichWithProfiles(approved ?? [])
  const mySubmissions = await loadMine(supabase, user.id)

  return NextResponse.json({ feed, mySubmissions })
}

async function enrichWithProfiles(
  rows: { id: string; title: string; body: string; status: string; created_at: string; user_id: string }[],
) {
  const ids = [...new Set(rows.map((r) => r.user_id))]
  if (ids.length === 0) return []
  let map = new Map<string, string | null>()
  try {
    const service = createServiceRoleClient()
    const { data: profs } = await service.from('profiles').select('id, full_name').in('id', ids)
    map = new Map((profs ?? []).map((p) => [p.id, p.full_name as string | null]))
  } catch {
    // Missing service key in dev: show tips without author names
  }
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    status: row.status,
    created_at: row.created_at,
    author_name: map.get(row.user_id) ?? null,
  }))
}

async function loadMine(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('community_tips')
    .select('id, title, body, status, created_at')
    .eq('user_id', userId)
    .in('status', ['pending', 'rejected'])
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) return []
  return data ?? []
}

export async function POST(req: NextRequest) {
  const supabase = await createRouteHandlerClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as { title?: unknown; body?: unknown }
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, MAX_TITLE) : ''
  const text = typeof body.body === 'string' ? body.body.trim().slice(0, MAX_BODY) : ''
  if (!title || !text) {
    return NextResponse.json({ error: 'Title and tip text are required.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('community_tips')
    .insert({
      user_id: user.id,
      title,
      body: text,
      status: 'pending',
    })
    .select('id, title, body, status, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tip: data })
}
