import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'

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

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10), 50)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const tab = searchParams.get('tab') || undefined

    const api = createOnlyFansAPI()
    api.setAccountId(connection.access_token)

    const [counts, list] = await Promise.all([
      api.getNotificationCounts(),
      api.listNotifications({ limit, offset, tab }),
    ])

    return NextResponse.json({
      counts,
      notifications: list.notifications,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch notifications'
    if (message.includes('ONLYFANS_SESSION_EXPIRED')) {
      return NextResponse.json(
        { error: 'OnlyFans session expired; please reconnect your account.' },
        { status: 401 },
      )
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

