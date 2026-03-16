import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'

/**
 * POST: Upload a file to OnlyFans for use in messages (DM or mass).
 * Accepts multipart/form-data with a single "file" field.
 * Returns { id, url, type } so the client can pass id(s) as mediaIds when sending messages.
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

    const formData = await req.formData()
    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file in form (field: file)' }, { status: 400 })
    }

    const api = createOnlyFansAPI(connection.access_token)
    const result = await api.uploadMedia(file)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[onlyfans/media/upload]', err)
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
