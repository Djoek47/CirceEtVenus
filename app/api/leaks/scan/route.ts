import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runLeakScan } from '@/lib/leaks/run-scan'

type ScanBody = {
  urls?: string[]
  aliases?: string[]
  limitPerQuery?: number
  /** Default true: filter search hits (Grok for Pro, keyword match otherwise). Manual URLs are always kept. */
  strict?: boolean
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: ScanBody = await req.json().catch(() => ({}))

  const result = await runLeakScan(supabase, {
    userId: user.id,
    urls: body.urls,
    aliases: body.aliases,
    limitPerQuery: body.limitPerQuery,
    strict: body.strict,
  })

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.message || 'Leak scan failed',
        inserted: result.inserted,
        skipped: result.skipped,
        filteredStrict: result.filteredStrict,
      },
      { status: 500 },
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
  })
}
