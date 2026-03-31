import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { runLeakScan } from '@/lib/leaks/run-scan'

export const maxDuration = 300

type Body = {
  aliases?: string[]
  former_usernames?: string[]
  title_hints?: string[]
  include_content_titles?: boolean
  urls?: string[]
  strict?: boolean
}

/**
 * Queues a leak scan after the HTTP response is sent (Divine Manager async path).
 * Auth: session cookie. Returns 202 immediately; work runs in after().
 */
export async function POST(req: NextRequest) {
  const supabase = await createRouteHandlerClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as Body
  const userId = user.id
  const params = {
    aliases: body.aliases,
    former_usernames: body.former_usernames,
    title_hints: body.title_hints,
    include_content_titles: body.include_content_titles !== false,
    urls: body.urls,
    strict: body.strict !== false,
  }

  after(async () => {
    try {
      await runLeakScan(supabase, {
        userId,
        ...params,
      })
    } catch (e) {
      console.error('[process-leak-scan after]', e)
    }
  })

  return NextResponse.json({ ok: true, queued: true }, { status: 202 })
}
