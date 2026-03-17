import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET: List creator's content (for Divine voice/chat). Optional ?limit=20&status=scheduled|draft|published
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const limit = Math.min(Number(searchParams.get('limit')) || 30, 50)
    const status = searchParams.get('status') || undefined

    let query = supabase
      .from('content')
      .select('id, title, description, content_type, platforms, status, scheduled_at, created_at')
      .eq('user_id', user.id)
      .order('scheduled_at', { ascending: true, nullsFirst: false })
      .limit(limit)
    if (status) query = query.eq('status', status)
    const { data: rows, error } = await query

    if (error) {
      console.error('[divine/content-list]', error)
      return NextResponse.json({ error: 'Failed to fetch content', content: [] }, { status: 500 })
    }

    const content = (rows || []).map((r: any) => ({
      id: r.id,
      title: r.title || 'Untitled',
      description: r.description ? String(r.description).slice(0, 200) : null,
      content_type: r.content_type,
      platforms: r.platforms || [],
      status: r.status,
      scheduled_at: r.scheduled_at,
      created_at: r.created_at,
    }))

    return NextResponse.json({ content })
  } catch (e) {
    console.error('[divine/content-list]', e)
    return NextResponse.json({ error: 'Failed to fetch content', content: [] }, { status: 500 })
  }
}
