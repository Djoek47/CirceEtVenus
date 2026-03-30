import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'

/** Creator post feed with media — used as "OF library" in AI Studio (metadata-first). */
export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '40', 10), 1), 80)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0)

  const { data: connection } = await supabase
    .from('platform_connections')
    .select('access_token')
    .eq('user_id', user.id)
    .eq('platform', 'onlyfans')
    .eq('is_connected', true)
    .maybeSingle()

  if (!connection?.access_token) {
    return NextResponse.json({ error: 'OnlyFans not connected', posts: [], total: 0 }, { status: 200 })
  }

  try {
    const api = createOnlyFansAPI(connection.access_token)
    const res = await api.getPosts({ limit, offset })
    return NextResponse.json({
      posts: res.posts ?? [],
      total: res.total ?? (res.posts?.length ?? 0),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load posts'
    return NextResponse.json({ error: message, posts: [], total: 0 }, { status: 502 })
  }
}
