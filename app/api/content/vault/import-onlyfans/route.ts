import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** Create a Creatix content row that references an OnlyFans post (metadata-first). */
export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null) as {
    postId?: string
    text?: string
    previewUrl?: string | null
    mediaType?: string
  } | null

  const postId = typeof body?.postId === 'string' ? body.postId.trim() : ''
  if (!postId) {
    return NextResponse.json({ error: 'postId required' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('content')
    .select('id')
    .eq('user_id', user.id)
    .eq('source_platform', 'onlyfans')
    .eq('external_post_id', postId)
    .maybeSingle()

  if (existing?.id) {
    return NextResponse.json({ contentId: existing.id, alreadyLinked: true })
  }

  const snippet =
    typeof body.text === 'string' && body.text.trim()
      ? body.text.trim().slice(0, 120)
      : `OnlyFans post ${postId}`
  const typeRaw = (body.mediaType || 'photo').toLowerCase()
  const content_type = typeRaw.includes('video') ? 'video' : 'photo'

  const row = {
    user_id: user.id,
    title: snippet || `OnlyFans ${postId}`,
    description: typeof body.text === 'string' ? body.text.trim().slice(0, 2000) : null,
    content_type,
    file_url: null as string | null,
    thumbnail_url: typeof body.previewUrl === 'string' ? body.previewUrl : null,
    platforms: ['onlyfans'] as string[],
    status: 'draft' as const,
    source_platform: 'onlyfans',
    external_post_id: postId,
    external_preview_url: typeof body.previewUrl === 'string' ? body.previewUrl : null,
  }

  const { data: inserted, error } = await supabase.from('content').insert(row).select('id').single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ contentId: inserted.id, alreadyLinked: false })
}
