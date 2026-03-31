import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { runLeakScan } from '@/lib/leaks/run-scan'

type ScanBody = {
  urls?: string[]
  aliases?: string[]
  former_usernames?: string[]
  title_hints?: string[]
  /** Default true: include titles from content library (skipped when content_ids set unless explicitly true) */
  include_content_titles?: boolean
  limitPerQuery?: number
  /** Default true: filter search hits (Grok for Pro, keyword match otherwise). Manual URLs are always kept. */
  strict?: boolean
  focus_handles?: string[]
  content_ids?: string[]
  focus_title_hints?: string[]
}

export async function POST(req: NextRequest) {
  const supabase = await createRouteHandlerClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: ScanBody = await req.json().catch(() => ({}))
  if (Array.isArray(body.focus_handles) && body.focus_handles.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Select at least one identity before running Protection scan.' },
      { status: 400 },
    )
  }

  const result = await runLeakScan(supabase, {
    userId: user.id,
    urls: body.urls,
    aliases: body.aliases,
    former_usernames: body.former_usernames,
    title_hints: body.title_hints,
    include_content_titles: body.include_content_titles,
    limitPerQuery: body.limitPerQuery,
    strict: body.strict,
    focus_handles: body.focus_handles,
    content_ids: body.content_ids,
    focus_title_hints: body.focus_title_hints,
  })

  if (!result.success) {
    const status = result.statusCode ?? 500
    return NextResponse.json(
      {
        success: false,
        error: result.message || 'Leak scan failed',
        inserted: result.inserted,
        skipped: result.skipped,
        filteredStrict: result.filteredStrict,
      },
      { status },
    )
  }

  return NextResponse.json({
    success: result.success,
    inserted: result.inserted,
    skipped: result.skipped,
    filteredStrict: result.filteredStrict,
    message: result.message,
    providerConfigured: result.providerConfigured,
    grokEnrichment: result.grokEnrichment,
    fetchVerified: result.fetchVerified,
    pageVerifyCount: result.pageVerifyCount,
  })
}
