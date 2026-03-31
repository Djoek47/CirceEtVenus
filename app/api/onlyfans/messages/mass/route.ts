import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { validateChatMediaIdsForSend } from '@/lib/onlyfans-chat-media'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'

// POST - Send a mass message
export async function POST(request: NextRequest) {
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
      .eq('platform', 'onlyfans')
      .eq('is_connected', true)
      .single()

    if (!connection) {
      return NextResponse.json({ error: 'OnlyFans not connected' }, { status: 400 })
    }

    const api = createOnlyFansAPI()
    api.setAccountId(connection.access_token)

    const body = await request.json()
    const { text, mediaIds, previews, price, targetLists, userIds } = body as {
      text?: string
      mediaIds?: (string | number)[]
      previews?: (string | number)[]
      price?: number
      targetLists?: string[]
      userIds?: string[]
    }

    const trimmed = text?.trim() ?? ''
    const hasText = trimmed.length > 0
    const hasMedia = Array.isArray(mediaIds) && mediaIds.length > 0

    if (!hasText && !hasMedia) {
      return NextResponse.json(
        { error: 'Message text or media required' },
        { status: 400 },
      )
    }

    const mediaErr = validateChatMediaIdsForSend(mediaIds)
    if (mediaErr) {
      return NextResponse.json({ error: mediaErr }, { status: 400 })
    }

    // OnlyFans rule: all paid messages must contain at least one media file.
    if (typeof price === 'number' && price > 0 && !hasMedia) {
      return NextResponse.json(
        { error: 'Paid messages must include at least one media file.' },
        { status: 400 },
      )
    }

    // previews must be subset of mediaIds if provided
    if (Array.isArray(previews) && previews.length > 0 && hasMedia) {
      const mediaSet = new Set(mediaIds.map((m) => String(m)))
      const invalid = previews.find((p) => !mediaSet.has(String(p)))
      if (invalid !== undefined) {
        return NextResponse.json(
          { error: 'Preview media must also be included in media files.' },
          { status: 400 },
        )
      }
    }

    const result = await api.sendMassMessage({
      text: trimmed || '',
      mediaFiles: hasMedia ? mediaIds : undefined,
      previews: Array.isArray(previews) && previews.length > 0 ? previews : undefined,
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
