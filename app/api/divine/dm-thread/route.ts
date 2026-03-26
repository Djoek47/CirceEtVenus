import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadDivineDmThread } from '@/lib/divine/divine-dm-thread'

/**
 * POST: Get DM thread with a fan for Divine context.
 * Body: { fanId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const fanId = body.fanId ?? body.fan_id
    if (!fanId) return NextResponse.json({ error: 'fanId required' }, { status: 400 })

    const limit = Math.min(Number(body.limit) || 50, 100)
    const out = await loadDivineDmThread(supabase, user.id, String(fanId), limit)

    if (!out.ok) {
      if (out.notFound) {
        return NextResponse.json({ error: out.error }, { status: 404 })
      }
      return NextResponse.json({ error: out.error }, { status: 400 })
    }

    return NextResponse.json({ fanId, thread: out.thread })
  } catch (e) {
    console.error('[divine/dm-thread]', e)
    return NextResponse.json({ error: 'Failed to fetch thread' }, { status: 500 })
  }
}
