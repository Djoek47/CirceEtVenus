import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'

/**
 * POST: Upload media for OnlyFans DMs / mass messages.
 *
 * - multipart/form-data: field `file` (binary) — preferred for local images.
 * - application/json: `{ "file_url": "https://..." }` — URL must be fetchable by OnlyFansAPI
 *   (signed cdn2.onlyfans.com URLs usually fail with 403).
 *
 * Returns `{ id, url?, type? }` where `id` is the OFAPI media id (e.g. ofapi_media_*) for
 * `mediaFiles` / `mediaIds` when sending chat messages. Do not reuse the same id across sends
 * if the API requires fresh uploads per message.
 */
export async function POST(req: NextRequest) {
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
      .single()

    if (!connection) {
      return NextResponse.json({ error: 'OnlyFans not connected' }, { status: 400 })
    }

    const api = createOnlyFansAPI(connection.access_token)
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const body = (await req.json().catch(() => ({}))) as { file_url?: string }
      const fileUrl = typeof body.file_url === 'string' ? body.file_url.trim() : ''
      if (!fileUrl) {
        return NextResponse.json(
          { error: 'JSON body must include file_url (https URL), or use multipart form with file field.' },
          { status: 400 },
        )
      }
      const result = await api.uploadMediaFromUrl(fileUrl)
      return NextResponse.json(result)
    }

    const formData = await req.formData()
    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file in form (field: file)' }, { status: 400 })
    }

    const result = await api.uploadMedia(file)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[onlyfans/media/upload]', err)
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
