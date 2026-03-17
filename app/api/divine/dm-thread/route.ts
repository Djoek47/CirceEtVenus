import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'

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

    const { data: connection } = await supabase
      .from('platform_connections')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('platform', 'onlyfans')
      .eq('is_connected', true)
      .maybeSingle()

    if (!connection?.access_token) {
      return NextResponse.json({ error: 'OnlyFans not connected' }, { status: 400 })
    }

    const api = createOnlyFansAPI(connection.access_token)
    const limit = Math.min(Number(body.limit) || 50, 100)
    const result = await api.getMessages(String(fanId), { limit })
    const messages = (result.messages || []).sort((a: any, b: any) => {
      const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0
      return ta - tb
    })
    const thread = messages.map((m: any) => ({
      from: m.isSentByMe ? 'creator' : 'fan',
      text: (m.text || '').replace(/<[^>]+>/g, ' ').trim().slice(0, 500),
      createdAt: m.createdAt,
    }))

    return NextResponse.json({ fanId, thread })
  } catch (e) {
    console.error('[divine/dm-thread]', e)
    return NextResponse.json({ error: 'Failed to fetch thread' }, { status: 500 })
  }
}
