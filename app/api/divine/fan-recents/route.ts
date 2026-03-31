import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { searchFanRecents, getFanRecentById, upsertFanRecentsMinimal } from '@/lib/divine/fan-recents-server'

/**
 * POST — sync fan rows from Messages UI (after loading conversations).
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as {
      rows?: Array<{ fanId: string; username?: string | null; displayName?: string | null; platform?: string }>
    }
    const rows = Array.isArray(body.rows) ? body.rows : []
    await upsertFanRecentsMinimal(supabase, user.id, rows)
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to sync fan recents'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * GET ?q= substring search, or ?fanId= single fan metadata (for DM overlay).
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const fanId = searchParams.get('fanId')?.trim()
    if (fanId) {
      const row = await getFanRecentById(supabase, user.id, fanId)
      return NextResponse.json({ fan: row })
    }

    const q = searchParams.get('q')?.trim() ?? ''
    const rows = await searchFanRecents(supabase, user.id, q, 25)
    return NextResponse.json({ fans: rows })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load fan recents'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
