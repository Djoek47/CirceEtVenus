import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizeScanHandle } from '@/lib/scan-identity'

function normalizeManualHandles(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const x of raw) {
    if (typeof x !== 'string') continue
    const n = normalizeScanHandle(x)
    if (!n || seen.has(n.toLowerCase())) continue
    seen.add(n.toLowerCase())
    out.push(n)
  }
  return out
}

function normalizePlatformHandles(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === 'string' && v.trim()) {
      out[k] = normalizeScanHandle(v)
    }
  }
  return Object.keys(out).length ? out : null
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: row, error } = await supabase
    .from('profiles')
    .select('reputation_manual_handles, reputation_display_name, reputation_platform_handles')
    .eq('id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    reputation_manual_handles: (row as { reputation_manual_handles?: string[] | null })?.reputation_manual_handles ?? [],
    reputation_display_name: (row as { reputation_display_name?: string | null })?.reputation_display_name ?? null,
    reputation_platform_handles:
      (row as { reputation_platform_handles?: Record<string, string> | null })?.reputation_platform_handles ?? null,
  })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))

  const patch: Record<string, unknown> = {}

  if ('reputation_manual_handles' in body) {
    patch.reputation_manual_handles = normalizeManualHandles(body.reputation_manual_handles)
  }
  if ('reputation_display_name' in body) {
    const d = body.reputation_display_name
    patch.reputation_display_name =
      d === null || d === ''
        ? null
        : typeof d === 'string'
          ? d.trim().slice(0, 200) || null
          : undefined
  }
  if ('reputation_platform_handles' in body) {
    patch.reputation_platform_handles = normalizePlatformHandles(body.reputation_platform_handles)
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
  }

  const { error } = await supabase.from('profiles').update(patch).eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
