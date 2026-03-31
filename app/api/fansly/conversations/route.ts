import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createFanslyAPI } from '@/lib/fansly-api'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: connection } = await supabase
      .from('platform_connections')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('platform', 'fansly')
      .eq('is_connected', true)
      .single()

    if (!connection?.access_token) {
      return NextResponse.json({ conversations: [], total: 0 })
    }

    const api = createFanslyAPI(connection.access_token)
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const result = await api.getChats({ limit, offset })
    const chats = result.data || []

    const conversations = chats.map((chat: any) => ({
      platform: 'fansly' as const,
      chatId: chat.id,
      user: {
        id: chat.user?.id,
        username: chat.user?.username,
        name: chat.user?.displayName || chat.user?.username,
        avatar: chat.user?.avatar,
      },
      lastMessage: {
        text: chat.lastMessage,
        createdAt: chat.updatedAt,
      },
      unreadCount: chat.unreadCount ?? 0,
    }))

    return NextResponse.json({
      conversations,
      total: result.total ?? conversations.length,
    })
  } catch (error) {
    console.error('Fansly conversations error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}
