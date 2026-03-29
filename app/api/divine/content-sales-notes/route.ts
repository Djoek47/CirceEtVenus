import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET — read sales metadata for one content row (?content_id=). RLS: own rows only.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const id = new URL(req.url).searchParams.get('content_id')?.trim() ?? ''
    if (!id) return NextResponse.json({ error: 'content_id is required' }, { status: 400 })

    const full = await supabase
      .from('content')
      .select('id, title, content_type, status, scheduled_at, sales_notes, teaser_tags, spoiler_level')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (full.error) {
      const minimal = await supabase
        .from('content')
        .select('id, title, content_type, status, scheduled_at')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle()
      if (minimal.error) {
        console.error('[content-sales-notes GET]', minimal.error)
        return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
      }
      if (!minimal.data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json({
        content: {
          ...minimal.data,
          sales_notes: null,
          teaser_tags: null,
          spoiler_level: null,
        },
      })
    }
    if (!full.data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ content: full.data })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * PATCH — update sales metadata for a content row (creator only).
 */
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as {
      content_id?: string
      sales_notes?: string | null
      teaser_tags?: string[]
      spoiler_level?: string | null
    }
    const id = typeof body.content_id === 'string' ? body.content_id.trim() : ''
    if (!id) return NextResponse.json({ error: 'content_id is required' }, { status: 400 })

    const patch: Record<string, unknown> = {}
    if (body.sales_notes !== undefined) {
      patch.sales_notes =
        typeof body.sales_notes === 'string' ? body.sales_notes.slice(0, 8000) : null
    }
    if (Array.isArray(body.teaser_tags)) {
      patch.teaser_tags = body.teaser_tags.map((t) => String(t).slice(0, 80)).filter(Boolean).slice(0, 40)
    }
    if (body.spoiler_level !== undefined) {
      patch.spoiler_level =
        typeof body.spoiler_level === 'string' ? body.spoiler_level.slice(0, 32) : null
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { error } = await supabase
      .from('content')
      .update(patch)
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[content-sales-notes]', error)
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
