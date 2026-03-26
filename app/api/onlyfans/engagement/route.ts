/**
 * GET /api/onlyfans/engagement
 * Message engagement insights: direct/mass lists, charts, top message, and optional message buyers.
 * Query: type=direct|mass, limit, startDate, endDate, period, messageId (for buyers).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'

/** OnlyFans engagement APIs often return 403 for non–performer / restricted accounts. */
function isEngagementAccessForbidden(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('[403]') ||
    m.includes('api error: 403') ||
    m.includes(' 403 ') ||
    (m.includes('403') && (m.includes('performer') || m.includes('access this endpoint'))) ||
    m.includes('real performer account')
  )
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: connection } = await supabase
      .from('platform_connections')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('platform', 'onlyfans')
      .eq('is_connected', true)
      .maybeSingle()

    if (!connection?.access_token) {
      return NextResponse.json({ error: 'OnlyFans is not connected' }, { status: 400 })
    }

    const api = createOnlyFansAPI()
    api.setAccountId(connection.access_token)

    const { searchParams } = new URL(request.url)
    const type = (searchParams.get('type') || 'direct') as 'direct' | 'mass'
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50)
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const period = searchParams.get('period') || undefined
    const messageId = searchParams.get('messageId') || undefined

    const [listRes, chartRes, topRes] = await Promise.all([
      type === 'mass'
        ? api.getMassMessagesEngagement({ limit, startDate, endDate })
        : api.getDirectMessagesEngagement({ limit, startDate, endDate }),
      type === 'mass'
        ? api.getMassMessagesChart({ startDate, endDate, period })
        : api.getDirectMessagesChart({ startDate, endDate, period }),
      api.getTopMessage({ startDate, endDate, period }),
    ])

    const messages = Array.isArray(listRes?.data) ? listRes.data : []
    const chart = Array.isArray(chartRes?.data) ? chartRes.data : []
    const topMessage = topRes?.data ?? null

    let buyers: unknown[] = []
    if (messageId) {
      const buyersRes = await api.getMessageBuyers(messageId, { limit: 25 })
      buyers = Array.isArray(buyersRes?.data) ? buyersRes.data : []
    } else if (topMessage && typeof topMessage === 'object' && 'id' in topMessage) {
      const buyersRes = await api.getMessageBuyers(String((topMessage as { id: string }).id), { limit: 25 })
      buyers = Array.isArray(buyersRes?.data) ? buyersRes.data : []
    }

    return NextResponse.json({
      type,
      messages,
      chart,
      topMessage,
      buyers,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch engagement'
    if (String(message).includes('ONLYFANS_SESSION_EXPIRED')) {
      return NextResponse.json({ error: 'OnlyFans session expired; please reconnect.' }, { status: 401 })
    }
    if (isEngagementAccessForbidden(message)) {
      return NextResponse.json(
        {
          error:
            'Message engagement analytics are not available for this OnlyFans account. The data partner only exposes this for eligible creator (performer) accounts.',
          code: 'ENGAGEMENT_FORBIDDEN',
          hint: 'If you use a valid creator account, contact OnlyFansAPI support if this persists.',
        },
        { status: 403 },
      )
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
