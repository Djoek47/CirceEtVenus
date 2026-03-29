import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST — log a Creatix-side DM send attribution (for bubble styling). Body: fan_id, platform, body_preview, source
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as {
      fan_id?: string
      platform?: string
      body_preview?: string
      source?: string
      onlyfans_message_id?: string
    }
    const fanId = typeof body.fan_id === 'string' ? body.fan_id.trim() : ''
    if (!fanId) return NextResponse.json({ error: 'fan_id is required' }, { status: 400 })
    const platform = body.platform === 'fansly' ? 'fansly' : 'onlyfans'
    const source =
      body.source === 'divine_scheduled' ? 'divine_scheduled' : body.source === 'divine' ? 'divine' : 'user'
    const preview =
      typeof body.body_preview === 'string' ? body.body_preview.slice(0, 2000) : ''
    const ofMid =
      typeof body.onlyfans_message_id === 'string' ? body.onlyfans_message_id.slice(0, 64) : null

    const { data, error } = await supabase
      .from('divine_dm_send_events')
      .insert({
        user_id: user.id,
        fan_id: fanId,
        platform,
        body_preview: preview || null,
        source,
        onlyfans_message_id: ofMid,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[dm-send-event]', error)
      return NextResponse.json({ error: 'Failed to log send' }, { status: 500 })
    }
    return NextResponse.json({ id: data?.id })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
