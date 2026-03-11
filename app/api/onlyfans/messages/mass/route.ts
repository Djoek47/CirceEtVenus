import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'

// POST - Send a mass message
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: connection } = await supabase
      .from('platform_connections')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('platform', 'onlyfans')
      .eq('is_connected', true)
      .single()

    if (!connection) {
      return NextResponse.json({ error: 'OnlyFans not connected' }, { status: 400 })
    }

    const api = createOnlyFansAPI()
    api.setAccountId(connection.access_token)

    const body = await request.json()
    const { text, mediaIds, price, targetLists, userIds } = body

    if (!text) {
      return NextResponse.json({ error: 'Message text required' }, { status: 400 })
    }

    const result = await api.sendMassMessage({
      text,
      mediaFiles: mediaIds,
      price,
      userLists: targetLists,
      userIds,
    })

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
    })
  } catch (error) {
    console.error('Failed to send mass message:', error)
    return NextResponse.json(
      { error: 'Failed to send mass message' },
      { status: 500 }
    )
  }
}
