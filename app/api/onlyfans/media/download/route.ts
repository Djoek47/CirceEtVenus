import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET: Proxy download for OnlyFans CDN media.
 * Query: ?cdnUrl=ENCODED_CDN_URL
 *
 * Uses OnlyFansAPI download pattern:
 *   GET https://app.onlyfansapi.com/api/{account}/media/download/{ONLYFANS_CDN_URL}
 *
 * We stream the binary back to the client.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cdnUrl = req.nextUrl.searchParams.get('cdnUrl')
    if (!cdnUrl) {
      return NextResponse.json({ error: 'cdnUrl query param is required' }, { status: 400 })
    }

    const { data: connection } = await supabase
      .from('platform_connections')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('platform', 'onlyfans')
      .eq('is_connected', true)
      .maybeSingle()

    if (!connection?.access_token) {
      return NextResponse.json({ error: 'OnlyFans not connected' }, { status: 400 })
    }

    const accountId = connection.access_token
    const apiKey = process.env.ONLYFANS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OnlyFans API key not configured' }, { status: 500 })
    }

    const downloadUrl = `https://app.onlyfansapi.com/api/${accountId}/media/download/${cdnUrl}`
    const res = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return NextResponse.json(
        { error: 'Failed to download media from OnlyFans', status: res.status, body: text || undefined },
        { status: 502 },
      )
    }

    const contentType = res.headers.get('content-type') || 'application/octet-stream'
    const contentLength = res.headers.get('content-length')

    return new NextResponse(res.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        ...(contentLength ? { 'Content-Length': contentLength } : {}),
      },
    })
  } catch (err) {
    console.error('[onlyfans/media/download]', err)
    return NextResponse.json({ error: 'Failed to download media' }, { status: 500 })
  }
}

