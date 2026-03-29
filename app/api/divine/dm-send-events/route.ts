import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET — recent send attribution for a fan thread (?fan_id=&limit=)
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const fanId = searchParams.get('fan_id')?.trim() ?? ''
    if (!fanId) return NextResponse.json({ error: 'fan_id is required' }, { status: 400 })
    const limit = Math.min(Number(searchParams.get('limit')) || 80, 200)

    const { data, error } = await supabase
      .from('divine_dm_send_events')
      .select('id, fan_id, platform, body_preview, source, onlyfans_message_id, created_at')
      .eq('user_id', user.id)
      .eq('fan_id', fanId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[dm-send-events]', error)
      return NextResponse.json({ events: [] }, { status: 200 })
    }
    return NextResponse.json({ events: data ?? [] })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
