import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { refreshFanThreadInsight } from '@/lib/divine/fan-thread-insight'

/**
 * POST { fanId, force?: boolean } — refresh stored thread snapshot + optional profile (creator session).
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as {
      fanId?: string
      force?: boolean
      platform?: string
    }
    const fanId = typeof body.fanId === 'string' ? body.fanId.trim() : ''
    if (!fanId) return NextResponse.json({ error: 'fanId required' }, { status: 400 })
    const platform = body.platform === 'fansly' ? 'fansly' : 'onlyfans'

    const result = await refreshFanThreadInsight(supabase, user.id, fanId, {
      force: body.force === true,
      // Respect 90s debounce unless force — avoids a second getMessages right after ChatWindow loads (rate limits).
      skipDebounce: body.force === true,
      platform,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      skipped: result.skipped,
      iteration: result.iteration,
      profileUpdated: result.profileUpdated,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Refresh failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
