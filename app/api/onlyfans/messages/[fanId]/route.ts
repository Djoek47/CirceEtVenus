import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'

// GET - Fetch messages with a specific fan
export async function GET(
  request: Request,
  { params }: { params: Promise<{ fanId: string }> }
) {
  try {
    const { fanId } = await params
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

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const before = searchParams.get('before') || undefined

    const result = await api.getMessages(fanId, { limit, before })

    return NextResponse.json({
      messages: (result.messages || []).sort((a: any, b: any) => {
        const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0
        const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0
        if (ta !== tb) return ta - tb
        return String(a?.id ?? '').localeCompare(String(b?.id ?? ''))
      }),
    })
  } catch (error) {
    console.error('Failed to fetch messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

// POST - Send a message to a fan
export async function POST(
  request: Request,
  { params }: { params: Promise<{ fanId: string }> }
) {
  try {
    const { fanId } = await params
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
    const { text, mediaIds, previews, price } = body
    const trimmed = typeof text === 'string' ? text.trim() : ''
    const hasText = trimmed.length > 0
    const hasMedia = Array.isArray(mediaIds) && mediaIds.length > 0

    if (!hasText && !hasMedia) {
      return NextResponse.json({ error: 'Message text or media required' }, { status: 400 })
    }

    // OnlyFans rule: all paid messages must contain at least one media file
    if (typeof price === 'number' && price > 0 && !hasMedia) {
      return NextResponse.json(
        { error: 'Paid messages must include at least one media file.' },
        { status: 400 },
      )
    }

    // previews must be subset of mediaIds if provided
    if (Array.isArray(previews) && previews.length > 0 && hasMedia) {
      const mediaSet = new Set(mediaIds.map((m: string | number) => String(m)))
      const invalid = previews.find((p: string | number) => !mediaSet.has(String(p)))
      if (invalid !== undefined) {
        return NextResponse.json(
          { error: 'Preview media must also be included in media files.' },
          { status: 400 },
        )
      }
    }

    const result = await api.sendMessage(fanId, {
      text: trimmed || '',
      mediaFiles: hasMedia ? mediaIds : undefined,
      previews: Array.isArray(previews) && previews.length > 0 ? previews : undefined,
      price: typeof price === 'number' && price >= 0 ? price : undefined,
    })

    return NextResponse.json({
      success: true,
      message: result,
    })
  } catch (error) {
    console.error('Failed to send message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
