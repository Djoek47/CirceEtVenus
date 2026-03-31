import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

/**
 * GET: List creator's content (for Divine voice/chat). Optional ?limit=20&status=scheduled|draft|published
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const limit = Math.min(Number(searchParams.get('limit')) || 30, 50)
    const status = searchParams.get('status') || undefined

    let query = supabase
      .from('content')
      .select(
        'id, title, description, content_type, platforms, status, scheduled_at, created_at, sales_notes, teaser_tags, spoiler_level',
      )
      .eq('user_id', user.id)
      .order('scheduled_at', { ascending: true, nullsFirst: false })
      .limit(limit)
    if (status) query = query.eq('status', status)
    const { data: rows, error } = await query

    let dataRows: any[] | null = rows
    if (error) {
      const retry = await supabase
        .from('content')
        .select('id, title, description, content_type, platforms, status, scheduled_at, created_at')
        .eq('user_id', user.id)
        .order('scheduled_at', { ascending: true, nullsFirst: false })
        .limit(limit)
      if (retry.error) {
        console.error('[divine/content-list]', error)
        return NextResponse.json({ error: 'Failed to fetch content', content: [] }, { status: 500 })
      }
      dataRows = retry.data
    }

    const content = (dataRows || []).map((r: any) => ({
      id: r.id,
      title: r.title || 'Untitled',
      description: r.description ? String(r.description).slice(0, 200) : null,
      content_type: r.content_type,
      platforms: r.platforms || [],
      status: r.status,
      scheduled_at: r.scheduled_at,
      created_at: r.created_at,
      sales_notes: r.sales_notes ? String(r.sales_notes).slice(0, 300) : null,
      teaser_tags: r.teaser_tags ?? undefined,
      spoiler_level: r.spoiler_level ?? undefined,
    }))

    return NextResponse.json({ content })
  } catch (e) {
    console.error('[divine/content-list]', e)
    return NextResponse.json({ error: 'Failed to fetch content', content: [] }, { status: 500 })
  }
}
