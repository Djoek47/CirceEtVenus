/**
 * GET /api/onlyfans/fans
 * List fans from OnlyFans API (live data). Query: filter=active|expired|latest|top, limit, offset, sort (for top).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
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
    const filter = (searchParams.get('filter') || 'active') as 'active' | 'expired' | 'latest' | 'top' | 'all'
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10), 50)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const sort = (searchParams.get('sort') || 'total') as
      | 'total'
      | 'subscriptions'
      | 'tips'
      | 'messages'
      | 'posts'
      | 'streams'

    let data: { data?: unknown[] }
    switch (filter) {
      case 'all':
        data = await api.getFansAll({ limit, offset })
        break
      case 'expired':
        data = await api.getFansExpired({ limit, offset })
        break
      case 'latest':
        data = await api.getFansLatest({ limit, offset })
        break
      case 'top':
        data = await api.getFansTop({ limit, offset, sort })
        break
      default:
        data = await api.getFansActive({ limit, offset })
    }

    const raw = Array.isArray(data?.data) ? data.data : []
    const fans = raw.map((row: Record<string, unknown>) => ({
      id: String(row.id ?? ''),
      platform_fan_id: String(row.id ?? ''),
      user_id: String(row.id ?? ''),
      platform: 'onlyfans' as const,
      platform_username: String(row.username ?? ''),
      display_name: row.name ? String(row.name) : null,
      avatar_url: row.avatar ? String(row.avatar) : null,
      tier: (Number(row.totalSpent) > 0 ? 'whale' : 'regular') as 'whale' | 'regular' | 'new' | 'inactive',
      total_spent: Number(row.totalSpent) || 0,
      subscription_start: row.subscribedAt ? String(row.subscribedAt) : null,
      last_interaction: null,
      notes: null,
      tags: Array.isArray(row.lists) ? (row.lists as string[]) : [],
      is_favorite: false,
      is_blocked: false,
      created_at: String(row.subscribedAt ?? new Date().toISOString()),
      updated_at: String(row.expiresAt ?? row.subscribedAt ?? new Date().toISOString()),
    }))
    return NextResponse.json({ fans, total: fans.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch fans'
    if (String(message).includes('ONLYFANS_SESSION_EXPIRED')) {
      return NextResponse.json({ error: 'OnlyFans session expired; please reconnect.' }, { status: 401 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
